import { getDb, getSettings } from "../../../../lib/db";
import { scoreCandidate, validateCandidate } from "../../../../lib/discovery";

export async function GET() {
  return Response.json({
    ok: true,
    mode: "dry-run-only",
    description: "Lead Discovery Engine v1 scores and stores supplied public-source candidates. It does not send email.",
    request: {
      candidates: [{
        company: "Example Company",
        division: "Engineering or Software",
        service: "What they appear to need",
        website: "https://...",
        contactName: "Optional",
        contactEmail: "Optional",
        sourceName: "RFP board / company site / directory",
        sourceUrl: "https://...",
        evidence: "Public evidence showing buyer intent"
      }]
    }
  });
}

export async function POST(request: Request) {
  const settings = await getSettings();
  if (!settings.dryRun) {
    return Response.json({ ok: false, error: "Discovery v1 is locked to Dry Run. Set dry_run=true before using it." }, { status: 409 });
  }

  const body = await request.json().catch(() => null) as { candidates?: unknown[] } | null;
  if (!body || !Array.isArray(body.candidates)) {
    return Response.json({ ok: false, error: "Body must contain a candidates array." }, { status: 400 });
  }
  if (body.candidates.length > 100) {
    return Response.json({ ok: false, error: "Maximum 100 candidates per discovery run." }, { status: 400 });
  }

  const candidates = body.candidates.map(validateCandidate).filter((x): x is NonNullable<typeof x> => Boolean(x));
  if (!candidates.length) {
    return Response.json({ ok: false, error: "No valid candidates supplied." }, { status: 400 });
  }

  const db = getDb();
  const runKey = `dry-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const runResult = await db.prepare(`INSERT INTO discovery_runs(run_key,status,dry_run,summary) VALUES(?, 'Running', 1, ?)`).bind(runKey, `Discovery Engine v1 evaluating ${candidates.length} candidate(s)`).run();
  const runId = Number(runResult.meta?.last_row_id ?? 0);

  let engineeringFound = 0;
  let softwareFound = 0;
  let qualified = 0;
  let rejected = 0;
  let review = 0;
  let leadsCreated = 0;
  const results = [];

  for (const candidate of candidates) {
    const scored = scoreCandidate(candidate);
    if (scored.division === "Engineering") engineeringFound++; else softwareFound++;
    if (scored.decision === "Qualified") qualified++; else if (scored.decision === "Rejected") rejected++; else review++;

    let leadId: number | null = null;
    if (scored.decision === "Qualified" && scored.contactEmail) {
      const existing = await db.prepare(`SELECT id FROM leads WHERE contact_email=? LIMIT 1`).bind(scored.contactEmail).first<{id:number}>();
      if (existing) {
        leadId = existing.id;
      } else {
        const leadResult = await db.prepare(`INSERT INTO leads(company,division,service,website,contact_name,contact_email,source_name,source_url,buyer_evidence,qualification_reason,ai_score,priority,email_verified,qualification_status,pipeline_stage,outreach_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,? ,0,'Qualified','New Lead','Not Ready')`)
          .bind(scored.company,scored.division,scored.service ?? null,scored.website ?? null,scored.contactName ?? null,scored.contactEmail,scored.sourceName ?? null,scored.sourceUrl ?? null,scored.evidence ?? null,scored.reason,scored.score,scored.score >= 85 ? "High" : "Medium").run();
        leadId = Number(leadResult.meta?.last_row_id ?? 0) || null;
        if (leadId) leadsCreated++;
      }
    }

    await db.prepare(`INSERT INTO discovery_candidates(run_id,company,division,service,website,contact_name,contact_email,source_name,source_url,evidence,ai_score,decision,decision_reason,lead_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(runId,scored.company,scored.division,scored.service ?? null,scored.website ?? null,scored.contactName ?? null,scored.contactEmail ?? null,scored.sourceName ?? null,scored.sourceUrl ?? null,scored.evidence ?? null,scored.score,scored.decision,scored.reason,leadId).run();

    results.push({ company: scored.company, division: scored.division, score: scored.score, decision: scored.decision, reason: scored.reason, leadId });
  }

  await db.prepare(`UPDATE discovery_runs SET status='Completed',engineering_found=?,software_found=?,qualified=?,rejected=?,summary=?,completed_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(engineeringFound,softwareFound,qualified,rejected,`Qualified ${qualified}; review ${review}; rejected ${rejected}; CRM leads created ${leadsCreated}.`,runId).run();

  await db.prepare(`INSERT INTO daily_reports(report_date,leads_found,qualified,updated_at) VALUES(date('now'),?,?,CURRENT_TIMESTAMP) ON CONFLICT(report_date) DO UPDATE SET leads_found=leads_found+excluded.leads_found, qualified=qualified+excluded.qualified, updated_at=CURRENT_TIMESTAMP`)
    .bind(candidates.length,qualified).run();

  return Response.json({
    ok: true,
    dryRun: true,
    runId,
    runKey,
    summary: { total: candidates.length, engineeringFound, softwareFound, qualified, review, rejected, leadsCreated },
    results,
    emailSending: false
  });
}

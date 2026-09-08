import { getDb, getSettings } from "../../../../lib/db";
import { POST as findNewClients } from "../../discovery/find-new-clients/route";
import { POST as sendApproved } from "../../outreach/send/route";

export const runtime = "nodejs";
export const maxDuration = 300;

type Stage = { ok?: boolean; error?: string; [key: string]: unknown };

async function runStage(name: string, fn: () => Promise<Response>): Promise<Stage> {
  try {
    const response = await fn();
    const text = await response.text();
    let data: Stage = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch { return { ok: false, error: `${name} returned invalid JSON (${response.status}).` }; }
    if (!response.ok) return { ...data, ok: false, error: String(data.error || `${name} failed (${response.status}).`) };
    return data;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : `${name} failed.` };
  }
}

export async function POST(req: Request) {
  const secret = process.env.AUTOMATION_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized automation request." }, { status: 401 });
  }

  const settings = await getSettings();
  if (settings.dryRun) {
    return Response.json({ ok: false, error: "Production automation is blocked while Dry Run is ON." }, { status: 409 });
  }

  const discovery = await runStage("Client discovery", findNewClients);
  if (discovery.ok === false) return Response.json({ ok: false, stage: "discovery", discovery }, { status: 502 });

  const db = getDb();
  const approved = await db.prepare(`
    UPDATE outreach_messages
    SET status='Approved', error_message=NULL
    WHERE status='Queued'
      AND sent_at IS NULL
      AND date(created_at)=date('now')
      AND lead_id IN (
        SELECT id FROM leads
        WHERE qualification_status='Qualified'
          AND email_verified=1
          AND contact_email IS NOT NULL
          AND trim(contact_email)<>''
          AND date(created_at)=date('now')
          AND lower(COALESCE(pipeline_stage,'')) NOT IN ('invalid','competitor','partner','do not contact')
      )
  `).run();

  await db.prepare(`
    UPDATE leads SET outreach_status='Approved', updated_at=CURRENT_TIMESTAMP
    WHERE id IN (
      SELECT lead_id FROM outreach_messages
      WHERE status='Approved' AND sent_at IS NULL AND date(created_at)=date('now')
    )
  `).run();

  const sends: Stage[] = [];
  for (let i = 0; i < 3; i++) {
    const result = await runStage(`Send batch ${i + 1}`, sendApproved);
    sends.push(result);
    if (result.ok === false || Number(result.sent || 0) === 0) break;
  }

  const totals = await db.prepare(`SELECT division,COUNT(*) n FROM outreach_messages WHERE status='Sent' AND date(sent_at)=date('now') GROUP BY division`).all<{division:string;n:number}>();
  const engineering = Number(totals.results.find(x => x.division === 'Engineering')?.n || 0);
  const software = Number(totals.results.find(x => x.division === 'Software')?.n || 0);

  return Response.json({
    ok: true,
    discovery,
    approved: Number((approved as any).meta?.changes || 0),
    sends,
    today: { engineering, software, total: engineering + software },
    targets: { engineering: settings.engineeringTarget, software: settings.softwareTarget, total: settings.totalLimit }
  });
}

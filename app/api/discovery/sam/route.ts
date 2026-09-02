import { getDb, getSettings } from "../../../../lib/db";
import { scoreCandidate } from "../../../../lib/discovery";
import { searchSam } from "../../../../lib/sam-discovery";

export async function GET(request: Request) {
  const settings = await getSettings();
  if (!settings.dryRun) return Response.json({ ok:false, error:"SAM discovery is locked to Dry Run." }, { status:409 });
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey) return Response.json({ ok:false, configured:false, dryRun:true, emailSending:false, error:"SAM_API_KEY is not configured in the Worker runtime." }, { status:503 });

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") ?? 14);
  const found = await searchSam(apiKey, days, 50);
  const db = getDb();
  const runKey = `sam-dry-${new Date().toISOString().replace(/[:.]/g,"-")}`;
  const rr = await db.prepare(`INSERT INTO discovery_runs(run_key,status,dry_run,summary) VALUES(?,'Running',1,?)`).bind(runKey,`SAM.gov dry-run: fetched ${found.fetched}`).run();
  const runId = Number(rr.meta?.last_row_id ?? 0);
  let eng=0,soft=0,qualified=0,review=0,rejected=0;
  const results=[];
  for (const input of found.candidates.slice(0,30)) {
    const s=scoreCandidate(input);
    if(s.division==="Engineering")eng++;else soft++;
    if(s.decision==="Qualified")qualified++;else if(s.decision==="Review")review++;else rejected++;
    await db.prepare(`INSERT INTO discovery_candidates(run_id,company,division,service,website,contact_name,contact_email,source_name,source_url,evidence,ai_score,decision,decision_reason) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(runId,s.company,s.division,s.service??null,s.website??null,s.contactName??null,s.contactEmail??null,s.sourceName??null,s.sourceUrl??null,s.evidence??null,s.score,s.decision,s.reason).run();
    results.push({company:s.company,division:s.division,service:s.service,score:s.score,decision:s.decision,sourceUrl:s.sourceUrl});
  }
  await db.prepare(`UPDATE discovery_runs SET status='Completed',engineering_found=?,software_found=?,qualified=?,rejected=?,summary=?,completed_at=CURRENT_TIMESTAMP WHERE id=?`).bind(eng,soft,qualified,rejected,`SAM.gov: ${qualified} qualified, ${review} review, ${rejected} rejected. No email sent.`,runId).run();
  await db.prepare(`INSERT INTO daily_reports(report_date,leads_found,qualified,updated_at) VALUES(date('now'),?,?,CURRENT_TIMESTAMP) ON CONFLICT(report_date) DO UPDATE SET leads_found=leads_found+excluded.leads_found,qualified=qualified+excluded.qualified,updated_at=CURRENT_TIMESTAMP`).bind(results.length,qualified).run();
  return Response.json({ok:true,configured:true,dryRun:true,emailSending:false,provider:"SAM.gov",runId,totalRecords:found.totalRecords,fetched:found.fetched,matched:results.length,summary:{engineering:eng,software:soft,qualified,review,rejected},results});
}

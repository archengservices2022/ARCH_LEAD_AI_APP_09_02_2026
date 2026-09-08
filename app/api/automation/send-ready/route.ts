import { getDb, getSettings } from "../../../../lib/db";
import { POST as sendApproved } from "../../outreach/send/route";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const secret = process.env.AUTOMATION_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ok:false,error:"Unauthorized automation request."},{status:401});
  const s = await getSettings();
  if (s.dryRun) return Response.json({ok:false,error:"Production sending is blocked while Dry Run is ON."},{status:409});
  const db = getDb();
  const approved = await db.prepare(`UPDATE outreach_messages SET status='Approved',error_message=NULL WHERE status='Queued' AND sent_at IS NULL AND lead_id IN (SELECT id FROM leads WHERE qualification_status='Qualified' AND email_verified=1 AND contact_email IS NOT NULL AND trim(contact_email)<>'' AND lower(COALESCE(pipeline_stage,'')) NOT IN ('invalid','competitor','partner','do not contact'))`).run();
  await db.prepare(`UPDATE leads SET outreach_status='Approved',updated_at=CURRENT_TIMESTAMP WHERE id IN (SELECT lead_id FROM outreach_messages WHERE status='Approved' AND sent_at IS NULL)`).run();
  const response = await sendApproved();
  const text = await response.text();
  let send:any={}; try{send=text?JSON.parse(text):{}}catch{send={ok:false,error:"Send returned invalid JSON."}}
  const totals=await db.prepare(`SELECT division,COUNT(*) n FROM outreach_messages WHERE status='Sent' AND date(sent_at)=date('now') GROUP BY division`).all<{division:string;n:number}>();
  const engineering=Number(totals.results.find(x=>x.division==='Engineering')?.n||0),software=Number(totals.results.find(x=>x.division==='Software')?.n||0);
  return Response.json({ok:response.ok,approved:Number((approved as any).meta?.changes||0),send,today:{engineering,software,total:engineering+software},targets:{engineering:s.engineeringTarget,software:s.softwareTarget,total:s.totalLimit}},{status:response.ok?200:response.status});
}

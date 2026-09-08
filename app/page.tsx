import Shell from "./components/Shell";
import { getDb, getSettings } from "../lib/db";

export const dynamic = "force-dynamic";

type CountRow={n:number};
type SentRow={engineering_sent:number;software_sent:number;total_sent:number;failed:number};
type Report={followups_sent:number;replies:number;interested:number;skipped:number};

export default async function Home() {
  const db=getDb();
  const settings=await getSettings();

  // Dashboard counters are calculated from the source tables instead of daily_reports.
  // This keeps the UI accurate immediately after discovery, approval and Gmail delivery.
  const [foundRow,qualifiedRow,sentRow,report]=await Promise.all([
    db.prepare(`SELECT COUNT(*) n FROM discovery_candidates WHERE date(created_at)=date('now')`).first<CountRow>(),
    db.prepare(`SELECT COUNT(*) n FROM discovery_candidates WHERE decision='Qualified' AND date(created_at)=date('now')`).first<CountRow>(),
    db.prepare(`SELECT
      SUM(CASE WHEN status='Sent' AND division='Engineering' THEN 1 ELSE 0 END) engineering_sent,
      SUM(CASE WHEN status='Sent' AND division='Software' THEN 1 ELSE 0 END) software_sent,
      SUM(CASE WHEN status='Sent' THEN 1 ELSE 0 END) total_sent,
      SUM(CASE WHEN error_message IS NOT NULL AND error_message<>'' THEN 1 ELSE 0 END) failed
      FROM outreach_messages WHERE date(COALESCE(sent_at,created_at))=date('now')`).first<SentRow>(),
    db.prepare(`SELECT followups_sent,replies,interested,skipped FROM daily_reports WHERE report_date=date('now') LIMIT 1`).first<Report>()
  ]);

  const leadsFound=Number(foundRow?.n||0);
  const qualified=Number(qualifiedRow?.n||0);
  const engineeringSent=Number(sentRow?.engineering_sent||0);
  const softwareSent=Number(sentRow?.software_sent||0);
  const totalSent=Number(sentRow?.total_sent||0);
  const failed=Number(sentRow?.failed||0);
  const followups=Number(report?.followups_sent||0);
  const replies=Number(report?.replies||0);
  const interested=Number(report?.interested||0);
  const skipped=Number(report?.skipped||0);

  const recentLeads=await db.prepare(`SELECT company,division,service,ai_score,qualification_status,outreach_status FROM leads WHERE qualification_status='Qualified' AND email_verified=1 AND date(created_at)=date('now') ORDER BY ai_score DESC, created_at DESC LIMIT 5`).all<{company:string;division:string;service:string|null;ai_score:number;qualification_status:string;outreach_status:string}>();
  const metrics=[["Leads Found",leadsFound],["Qualified",qualified],["Total Sent",`${totalSent} / ${settings.totalLimit}`],["Engineering",`${engineeringSent} / ${settings.engineeringTarget}`],["Software",`${softwareSent} / ${settings.softwareTarget}`],["Replies",replies],["Follow-ups",followups],["Interested",interested]];
  const progress=settings.totalLimit?Math.min(100,(totalSent/settings.totalLimit)*100):0;

  return <Shell active="/" dryRun={settings.dryRun}>
    <header><div><h1>Outreach Command Center</h1><p>Arch Engineering Services · Daily client acquisition & outreach</p></div><LinkButton href="/leads">View CRM Leads</LinkButton></header>
    <div className="target"><div><strong>Today's Outreach</strong><p>Daily target: {settings.engineeringTarget} Engineering + {settings.softwareTarget} Software</p></div><div className="progress"><span>{totalSent} / {settings.totalLimit} sent</span><div><i style={{width:`${progress}%`}} /></div></div></div>
    <div className="metrics">{metrics.map(([a,b])=><article key={String(a)}><p>{a}</p><strong>{b}</strong><small>Today</small></article>)}</div>
    <div className="grid"><article className="panel"><div className="panelHead"><div><h2>Recent Qualified Clients</h2><p>Today's verified prospects and their current outreach stage</p></div></div>{recentLeads.results.length?<div className="tableWrap"><table><thead><tr><th>Company</th><th>Division</th><th>Service</th><th>Score</th><th>Status</th></tr></thead><tbody>{recentLeads.results.map((l,i)=><tr key={i}><td>{l.company}</td><td>{l.division}</td><td>{l.service||"Not specified"}</td><td>{l.ai_score}</td><td>{l.outreach_status}</td></tr>)}</tbody></table></div>:<div className="empty">No new verified prospects today.</div>}</article>
    <article className="panel"><div className="panelHead"><div><h2>Outreach Status</h2><p>Live D1 delivery breakdown</p></div></div><div className="rows"><div><span>Engineering</span><b>{engineeringSent} / {settings.engineeringTarget}</b></div><div><span>Software</span><b>{softwareSent} / {settings.softwareTarget}</b></div><div><span>Failed</span><b>{failed}</b></div><div><span>Skipped</span><b>{skipped}</b></div></div></article></div>
    <div className="safeBanner"><b>Safety:</b> Dry Run is {settings.dryRun?"ON":"OFF"}. Approval alone does not send while Dry Run is ON.</div>
  </Shell>;
}

function LinkButton({href,children}:{href:string;children:React.ReactNode}){return <a className="buttonLink" href={href}>{children}</a>;}

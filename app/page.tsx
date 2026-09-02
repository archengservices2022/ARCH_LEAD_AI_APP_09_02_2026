import Shell from "./components/Shell";
import { getDb, getSettings } from "../lib/db";

export const dynamic = "force-dynamic";

type Report = {leads_found:number;qualified:number;engineering_sent:number;software_sent:number;total_sent:number;followups_sent:number;replies:number;interested:number;failed:number;skipped:number};

export default async function Home() {
  const db = getDb();
  const settings = await getSettings();
  const report = await db.prepare(`SELECT leads_found,qualified,engineering_sent,software_sent,total_sent,followups_sent,replies,interested,failed,skipped FROM daily_reports WHERE report_date=date('now') LIMIT 1`).first<Report>() ?? {leads_found:0,qualified:0,engineering_sent:0,software_sent:0,total_sent:0,followups_sent:0,replies:0,interested:0,failed:0,skipped:0};
  const recentLeads = await db.prepare(`SELECT company,division,service,ai_score,qualification_status FROM leads ORDER BY created_at DESC LIMIT 5`).all<{company:string;division:string;service:string|null;ai_score:number;qualification_status:string}>();
  const metrics = [["Leads Found",report.leads_found],["Qualified",report.qualified],["Total Sent",`${report.total_sent} / ${settings.totalLimit}`],["Engineering",`${report.engineering_sent} / ${settings.engineeringTarget}`],["Software",`${report.software_sent} / ${settings.softwareTarget}`],["Replies",report.replies],["Follow-ups",report.followups_sent],["Interested",report.interested]];
  const progress = settings.totalLimit ? Math.min(100,(report.total_sent/settings.totalLimit)*100) : 0;
  return <Shell active="/" dryRun={settings.dryRun}>
    <header><div><h1>Outreach Command Center</h1><p>Arch Engineering Services · Daily lead intelligence & outreach</p></div><LinkButton href="/leads">+ Add / View Leads</LinkButton></header>
    <div className="target"><div><strong>Today's Outreach</strong><p>Daily target: {settings.engineeringTarget} Engineering + {settings.softwareTarget} Software</p></div><div className="progress"><span>{report.total_sent} / {settings.totalLimit} sent</span><div><i style={{width:`${progress}%`}} /></div></div></div>
    <div className="metrics">{metrics.map(([a,b])=><article key={String(a)}><p>{a}</p><strong>{b}</strong><small>Today</small></article>)}</div>
    <div className="grid"><article className="panel"><div className="panelHead"><div><h2>Recent Leads</h2><p>Latest prospects stored in Cloudflare D1</p></div></div>{recentLeads.results.length?<div className="tableWrap"><table><thead><tr><th>Company</th><th>Division</th><th>Service</th><th>Score</th></tr></thead><tbody>{recentLeads.results.map((l,i)=><tr key={i}><td>{l.company}</td><td>{l.division}</td><td>{l.service||"—"}</td><td>{l.ai_score}</td></tr>)}</tbody></table></div>:<div className="empty">No leads discovered yet today.</div>}</article>
    <article className="panel"><div className="panelHead"><div><h2>Outreach Status</h2><p>Live D1 delivery breakdown</p></div></div><div className="rows"><div><span>Engineering</span><b>{report.engineering_sent} / {settings.engineeringTarget}</b></div><div><span>Software</span><b>{report.software_sent} / {settings.softwareTarget}</b></div><div><span>Failed</span><b>{report.failed}</b></div><div><span>Skipped</span><b>{report.skipped}</b></div></div></article></div>
    <div className="safeBanner"><b>Safety:</b> Dry Run is {settings.dryRun?"ON":"OFF"}. No email-sending code is enabled in this release.</div>
  </Shell>;
}

function LinkButton({href,children}:{href:string;children:React.ReactNode}) { return <a className="buttonLink" href={href}>{children}</a>; }

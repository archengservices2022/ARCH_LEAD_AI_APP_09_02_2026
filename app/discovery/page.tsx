import Shell from "../components/Shell";
import {getDb,getSettings} from "../../lib/db";
import {queryPlan} from "../../lib/discovery-plan";
export const dynamic="force-dynamic";
export default async function Discovery(){
  const db=getDb();const s=await getSettings();const plan=queryPlan();
  const runs=await db.prepare(`SELECT id,run_key,status,engineering_found,software_found,qualified,rejected,dry_run,started_at,completed_at FROM discovery_runs ORDER BY started_at DESC LIMIT 30`).all<any>();
  const c=await db.prepare(`SELECT company,division,service,website,contact_email,ai_score,decision,decision_reason,created_at FROM discovery_candidates ORDER BY created_at DESC LIMIT 100`).all<any>();
  return <Shell active="/discovery" dryRun={s.dryRun}>
    <header><div><h1>Lead Discovery</h1><p>Discovery plans, qualification evidence and AI scoring</p></div></header>
    <div className="safeBanner"><b>Dry Run:</b> discovery and scoring may store prospects in D1, but customer email sending is disabled.</div>
    <div className="grid">
      <article className="panel"><div className="panelHead"><div><h2>Engineering Search Plan</h2><p>Buyer-intent searches for CAD and mechanical work</p></div></div><div className="queryList">{plan.engineering.map((q)=><div key={q.label}><b>{q.label}</b><span>{q.query}</span></div>)}</div></article>
      <article className="panel"><div className="panelHead"><div><h2>Software Search Plan</h2><p>Buyer-intent searches for software and automation work</p></div></div><div className="queryList">{plan.software.map((q)=><div key={q.label}><b>{q.label}</b><span>{q.query}</span></div>)}</div></article>
    </div>
    <div className="grid"><article className="panel"><div className="panelHead"><div><h2>Discovery Runs</h2><p>Dry-run discovery history</p></div></div>{runs.results.length?<div className="tableWrap"><table><thead><tr><th>Run</th><th>Status</th><th>Eng</th><th>Software</th><th>Qualified</th></tr></thead><tbody>{runs.results.map((r:any)=><tr key={r.id}><td>{r.run_key}</td><td>{r.status}</td><td>{r.engineering_found}</td><td>{r.software_found}</td><td>{r.qualified}</td></tr>)}</tbody></table></div>:<div className="empty">No discovery runs yet.</div>}</article><article className="panel"><div className="panelHead"><div><h2>Safety Mode</h2><p>Discovery may collect leads; sending remains disabled</p></div></div><div className="rows"><div><span>Dry Run</span><b>{s.dryRun?"ON":"OFF"}</b></div><div><span>Engineering target</span><b>{s.engineeringTarget}</b></div><div><span>Software target</span><b>{s.softwareTarget}</b></div><div><span>Daily maximum</span><b>{s.totalLimit}</b></div></div></article></div>
    <article className="panel wide"><div className="panelHead"><div><h2>Recent Candidates</h2><p>Prospects evaluated before becoming CRM leads</p></div></div>{c.results.length?<div className="tableWrap"><table><thead><tr><th>Company</th><th>Division</th><th>Service</th><th>Email</th><th>Score</th><th>Decision</th><th>Reason</th></tr></thead><tbody>{c.results.map((x:any,i:number)=><tr key={i}><td>{x.company}</td><td>{x.division}</td><td>{x.service||"—"}</td><td>{x.contact_email||"—"}</td><td>{x.ai_score}</td><td>{x.decision}</td><td>{x.decision_reason||"—"}</td></tr>)}</tbody></table></div>:<div className="empty">No candidates evaluated yet.</div>}</article>
  </Shell>
}

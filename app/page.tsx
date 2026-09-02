const metrics = [
  ["Leads Found", "0"], ["Qualified", "0"], ["Total Sent", "0 / 20"],
  ["Engineering", "0 / 10"], ["Software", "0 / 10"], ["Replies", "0"],
  ["Follow-ups", "0"], ["Interested", "0"]
];
const tabs = ["Dashboard", "Lead Discovery", "CRM Leads", "Outreach", "Follow-ups & Replies", "Daily Reports"];
export default function Home() {
  return <main className="shell">
    <aside><div className="brand"><b>ARCH</b><span>Lead AI</span></div><nav>{tabs.map((x,i)=><a className={i===0?"active":""} key={x}>{x}</a>)}</nav><div className="mode"><span>●</span> Dry Run Enabled</div></aside>
    <section className="content"><header><div><h1>Outreach Command Center</h1><p>Arch Engineering Services · Daily lead intelligence & outreach</p></div><button>+ Add Lead</button></header>
      <div className="target"><div><strong>Today's Outreach</strong><p>Daily target: 10 Engineering + 10 Software</p></div><div className="progress"><span>0 / 20 sent</span><div><i /></div></div></div>
      <div className="metrics">{metrics.map(([a,b])=><article key={a}><p>{a}</p><strong>{b}</strong><small>Today</small></article>)}</div>
      <div className="grid"><article className="panel"><div className="panelHead"><div><h2>Today's Lead Discovery</h2><p>Every prospect identified by Arch AI</p></div><button className="ghost">View all leads</button></div><div className="empty">No leads discovered yet today.<br/><span>Discovery results, qualification evidence and AI scores will appear here.</span></div></article>
      <article className="panel"><div className="panelHead"><div><h2>Outreach Status</h2><p>Live delivery breakdown</p></div></div><div className="rows"><div><span>Engineering</span><b>0 / 10</b></div><div><span>Software</span><b>0 / 10</b></div><div><span>Failed</span><b>0</b></div><div><span>Skipped</span><b>0</b></div></div></article></div>
      <div className="grid"><article className="panel"><div className="panelHead"><div><h2>Recent Outreach</h2><p>Customer emails recorded in Cloudflare D1</p></div></div><div className="empty small">No outreach recorded yet.</div></article><article className="panel"><div className="panelHead"><div><h2>Needs Attention</h2><p>Replies, follow-ups and delivery issues</p></div></div><div className="empty small">You're all caught up.</div></article></div>
    </section>
  </main>
}

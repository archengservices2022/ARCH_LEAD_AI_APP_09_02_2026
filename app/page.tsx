type DashboardData = {
  ok: boolean;
  report: {
    leads_found: number;
    qualified: number;
    engineering_sent: number;
    software_sent: number;
    total_sent: number;
    followups_sent: number;
    replies: number;
    interested: number;
    bounced: number;
    failed: number;
    skipped: number;
  };
  settings: {
    dry_run: boolean;
    engineering_target: number;
    software_target: number;
    total_limit: number;
  };
};

const tabs = ["Dashboard", "Lead Discovery", "CRM Leads", "Outreach", "Follow-ups & Replies", "Daily Reports"];

async function getDashboard(): Promise<DashboardData> {
  const baseUrl = process.env.CF_PAGES_URL
    ? `https://${process.env.CF_PAGES_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/dashboard`, { cache: "no-store" });
    if (!response.ok) throw new Error("Dashboard API unavailable");
    return await response.json();
  } catch {
    return {
      ok: false,
      report: { leads_found: 0, qualified: 0, engineering_sent: 0, software_sent: 0, total_sent: 0, followups_sent: 0, replies: 0, interested: 0, bounced: 0, failed: 0, skipped: 0 },
      settings: { dry_run: true, engineering_target: 10, software_target: 10, total_limit: 20 },
    };
  }
}

export default async function Home() {
  const data = await getDashboard();
  const r = data.report;
  const s = data.settings;
  const metrics = [
    ["Leads Found", String(r.leads_found)],
    ["Qualified", String(r.qualified)],
    ["Total Sent", `${r.total_sent} / ${s.total_limit}`],
    ["Engineering", `${r.engineering_sent} / ${s.engineering_target}`],
    ["Software", `${r.software_sent} / ${s.software_target}`],
    ["Replies", String(r.replies)],
    ["Follow-ups", String(r.followups_sent)],
    ["Interested", String(r.interested)],
  ];
  const progress = s.total_limit > 0 ? Math.min(100, (r.total_sent / s.total_limit) * 100) : 0;

  return <main className="shell">
    <aside><div className="brand"><b>ARCH</b><span>Lead AI</span></div><nav>{tabs.map((x,i)=><a className={i===0?"active":""} key={x}>{x}</a>)}</nav><div className="mode"><span>●</span> {s.dry_run ? "Dry Run Enabled" : "Live Mode"}</div></aside>
    <section className="content"><header><div><h1>Outreach Command Center</h1><p>Arch Engineering Services · Daily lead intelligence & outreach</p></div><button>+ Add Lead</button></header>
      <div className="target"><div><strong>Today's Outreach</strong><p>Daily target: {s.engineering_target} Engineering + {s.software_target} Software</p></div><div className="progress"><span>{r.total_sent} / {s.total_limit} sent</span><div><i style={{width:`${progress}%`}} /></div></div></div>
      <div className="metrics">{metrics.map(([a,b])=><article key={a}><p>{a}</p><strong>{b}</strong><small>Today</small></article>)}</div>
      <div className="grid"><article className="panel"><div className="panelHead"><div><h2>Today's Lead Discovery</h2><p>Every prospect identified by Arch AI</p></div><button className="ghost">View all leads</button></div><div className="empty">{r.leads_found === 0 ? <>No leads discovered yet today.<br/><span>Discovery results, qualification evidence and AI scores will appear here.</span></> : <>{r.leads_found} leads discovered today.<br/><span>{r.qualified} currently qualified.</span></>}</div></article>
      <article className="panel"><div className="panelHead"><div><h2>Outreach Status</h2><p>Live delivery breakdown</p></div></div><div className="rows"><div><span>Engineering</span><b>{r.engineering_sent} / {s.engineering_target}</b></div><div><span>Software</span><b>{r.software_sent} / {s.software_target}</b></div><div><span>Failed</span><b>{r.failed}</b></div><div><span>Skipped</span><b>{r.skipped}</b></div></div></article></div>
      <div className="grid"><article className="panel"><div className="panelHead"><div><h2>Recent Outreach</h2><p>Customer emails recorded in Cloudflare D1</p></div></div><div className="empty small">{r.total_sent === 0 ? "No outreach recorded yet." : `${r.total_sent} outreach messages recorded today.`}</div></article><article className="panel"><div className="panelHead"><div><h2>Needs Attention</h2><p>Replies, follow-ups and delivery issues</p></div></div><div className="empty small">{r.replies + r.followups_sent + r.failed === 0 ? "You're all caught up." : `${r.replies} replies · ${r.followups_sent} follow-ups · ${r.failed} failed`}</div></article></div>
    </section>
  </main>
}

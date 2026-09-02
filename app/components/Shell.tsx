import Link from "next/link";

const items = [
  ["Dashboard", "/"],
  ["Lead Discovery", "/discovery"],
  ["CRM Leads", "/leads"],
  ["Outreach", "/outreach"],
  ["Follow-ups & Replies", "/followups"],
  ["Daily Reports", "/reports"],
];

export default function Shell({active,dryRun,children}:{active:string;dryRun:boolean;children:React.ReactNode}) {
  return <main className="shell">
    <aside>
      <div className="brand"><b>ARCH</b><span>Lead AI</span></div>
      <nav>{items.map(([label,href])=><Link key={href} href={href} className={active===href?"active":""}>{label}</Link>)}</nav>
      <div className="mode"><span>●</span>{dryRun ? "Dry Run Enabled" : "Live Mode"}</div>
    </aside>
    <section className="content">{children}</section>
  </main>;
}

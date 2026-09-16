"use client";
import{useState}from"react";

type Step={name:string;path:string;method:"GET"|"POST"};
const steps:Step[]=[
 {name:"Engineering search",path:"/api/discovery/mechanical",method:"GET"},
 {name:"Software search",path:"/api/discovery/software",method:"GET"},
 {name:"Public contact verification",path:"/api/discovery/enrich-contacts",method:"POST"},
 {name:"CRM promotion",path:"/api/discovery/promote-ready",method:"POST"},
 {name:"Draft preparation",path:"/api/outreach/prepare",method:"POST"},
];
async function callStep(step:Step){try{const r=await fetch(step.path,{method:step.method,headers:{Accept:"application/json"},cache:"no-store"});const text=await r.text();let data:any={};try{data=text?JSON.parse(text):{}}catch{data={error:`${step.name} returned invalid JSON`}}return{...step,status:r.status,ok:r.ok,data}}catch(e){return{...step,status:0,ok:false,data:{error:e instanceof Error?e.message:`${step.name} failed`}}}}
export default function DiscoveryControls(){const[busy,setBusy]=useState(false),[msg,setMsg]=useState("");async function run(){setBusy(true);setMsg("Arch AI is finding real Engineering and Software opportunities first, then checking public contacts in short safe stages...");try{const results:any[]=[];for(const step of steps){setMsg(`Running ${step.name}...`);results.push(await callStep(step))}
 const eng=results[0]?.data||{},sw=results[1]?.data||{},enrich=results[2]?.data||{},promote=results[3]?.data||{},drafts=results[4]?.data||{};
 const found=(eng.summary?.found??eng.results?.length??0)+(sw.summary?.found??sw.results?.length??0);const qualified=(eng.summary?.qualified??0)+(sw.summary?.qualified??0);const verified=enrich.enriched??enrich.verified??0;const websites=enrich.researchedWebsites??0;const newLeads=promote.ready??0;const queued=drafts.queued??0;const failed=results.filter(x=>!x.ok).map(x=>`${x.name} (${x.status||"network"})`);
 setMsg(`Client search complete — ${found} found, ${qualified} qualified, ${websites} official websites available, ${verified} public contacts verified, ${newLeads} new CRM leads, ${queued} drafts prepared.${failed.length?` Continued past: ${failed.join(", ")}.`:""} No guessed emails. No customer email sent from this button.`)}catch(e){setMsg(e instanceof Error?e.message:"Client search could not complete")}finally{setBusy(false)}}return <div className="discoveryControls"><button onClick={run} disabled={busy} style={{fontSize:18,fontWeight:800,padding:"14px 24px"}}>{busy?"Arch AI Is Finding Clients…":"Find New Clients"}</button><div style={{marginTop:8,fontSize:13,opacity:.75}}>July-style flow: find real companies/opportunities first, verify public contacts, save safe leads, prepare drafts. Apollo is optional and is not required.</div>{msg&&<div style={{marginTop:12,padding:"12px 14px",border:"1px solid #cbd5e1",borderRadius:8,background:"#f8fafc",fontWeight:700,lineHeight:1.5}}>{msg}</div>}</div>}

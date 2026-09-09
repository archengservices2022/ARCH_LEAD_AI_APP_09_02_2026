// OpenNext generates this module during the Cloudflare build.
// @ts-ignore
import handler from "./.open-next/worker.js";

type CronController = { scheduledTime: number };
type WorkerExecutionContext = { waitUntil(promise: Promise<unknown>): void };

function chicagoParts(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(timestamp));
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

const BASE = "https://arch-lead-ai-app-09-02-2026.archengservices2022.workers.dev";
type Stage = { name:string; path:string; method?:"GET"|"POST" };

async function runStage(stage:Stage,headers:Headers){
  const response=await fetch(`${BASE}${stage.path}`,{method:stage.method||"POST",headers});
  const text=await response.text();
  let data:any={};
  try{data=text?JSON.parse(text):{}}catch{data={raw:text.slice(0,1000)}}
  if(!response.ok)throw new Error(`${stage.name} failed (${response.status}): ${text.slice(0,700)}`);
  console.log(`${stage.name} completed`,JSON.stringify(data).slice(0,3000));
  return data;
}

function sentTotal(x:any){return Number(x?.today?.total||x?.send?.today?.total||0)}

async function runDaily(headers:Headers){
  // Every stage is an external Worker request, preserving a fresh Cloudflare subrequest budget.
  // The cycle replenishes buyer identities when verification yield is low instead of stopping after 35 raw prospects.
  const report:any={startedAt:new Date().toISOString(),cycles:[],stages:{}};
  report.stages.targets=await runStage({name:"Apply outreach targets",path:"/api/automation/apply-outreach-targets"},headers);
  const target=Number(report.stages.targets?.targets?.total||35);
  const maxCycles=4;

  for(let cycle=1;cycle<=maxCycles;cycle++){
    const c:any={cycle};
    c.apollo=await runStage({name:`Apollo buyer discovery cycle ${cycle}`,path:"/api/discovery/apollo",method:"GET"},headers);
    c.apolloEnrichment=await runStage({name:`Apollo verification cycle ${cycle}`,path:"/api/discovery/apollo-enrich"},headers);
    c.discovery=await runStage({name:`Core discovery + promotion + drafts cycle ${cycle}`,path:"/api/automation/daily-outreach"},headers);
    c.send1=await runStage({name:`Approve + send cycle ${cycle} batch 1`,path:"/api/automation/send-ready"},headers);
    c.send2=await runStage({name:`Approve + send cycle ${cycle} batch 2`,path:"/api/automation/send-ready"},headers);
    c.sentToday=Math.max(sentTotal(c.send1),sentTotal(c.send2));
    report.cycles.push(c);
    if(c.sentToday>=target){report.targetReached=true;break}
    const stored=Number(c.apollo?.summary?.stored||0);
    if(stored===0&&cycle>=2){report.stopReason="Apollo prospect pool exhausted or all remaining companies are duplicates.";break}
  }

  report.completedAt=new Date().toISOString();
  report.sentToday=report.cycles.length?report.cycles[report.cycles.length-1].sentToday:0;
  report.target=target;
  console.log("ARCH_DAILY_OUTREACH_COMPLETE",JSON.stringify(report).slice(0,20000));
  return report;
}

const worker = {
  fetch: handler.fetch,
  async scheduled(controller: CronController, env: CloudflareEnv, ctx: WorkerExecutionContext) {
    const local = chicagoParts(controller.scheduledTime);
    const weekday = local.weekday;
    const hour = Number(local.hour);
    if (!weekday || !["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday) || hour !== 8) return;
    const headers = new Headers({ "content-type": "application/json" });
    const secret = (env as unknown as Record<string, string | undefined>).AUTOMATION_SECRET;
    if (secret) headers.set("authorization", `Bearer ${secret}`);
    ctx.waitUntil(runDaily(headers).catch((error)=>{
      console.error("Daily 8 AM outreach failed",error);
      throw error;
    }));
  },
};

export default worker;

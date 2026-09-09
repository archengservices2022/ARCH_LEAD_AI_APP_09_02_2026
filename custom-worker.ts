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

async function runDaily(headers:Headers){
  // Each stage is an external Worker request so it gets its own Cloudflare subrequest budget.
  const stages:Stage[]=[
    {name:"Apply outreach targets",path:"/api/automation/apply-outreach-targets"},
    {name:"Apollo buyer discovery",path:"/api/discovery/apollo",method:"GET"},
    {name:"Apollo buyer-fit + public contact verification",path:"/api/discovery/apollo-enrich"},
    {name:"Core discovery + promotion + draft preparation",path:"/api/automation/daily-outreach"},
    {name:"Approve + send batch 1",path:"/api/automation/send-ready"},
    {name:"Approve + send batch 2",path:"/api/automation/send-ready"}
  ];
  const report:any={startedAt:new Date().toISOString(),stages:{}};
  for(const s of stages){report.stages[s.name]=await runStage(s,headers)}
  report.completedAt=new Date().toISOString();
  console.log("ARCH_DAILY_OUTREACH_COMPLETE",JSON.stringify(report).slice(0,12000));
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

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

async function postStage(path:string,headers:Headers){
  const response=await fetch(`${BASE}${path}`,{method:"POST",headers});
  const text=await response.text();
  if(!response.ok)throw new Error(`${path} failed (${response.status}): ${text.slice(0,500)}`);
  console.log(`${path} completed`,text.slice(0,2000));
}

async function runDaily(headers:Headers){
  // Separate external requests preserve a fresh Cloudflare request/subrequest budget for each stage.
  await postStage("/api/automation/apply-outreach-targets",headers);
  await postStage("/api/automation/daily-outreach",headers);
  await postStage("/api/automation/send-ready",headers);
  await postStage("/api/automation/send-ready",headers);
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

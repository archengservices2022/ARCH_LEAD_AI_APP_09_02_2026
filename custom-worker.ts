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

    const url = "https://arch-lead-ai-app-09-02-2026.archengservices2022.workers.dev/api/automation/daily-outreach";
    ctx.waitUntil(fetch(url, { method: "POST", headers }).then(async (response) => {
      const text = await response.text();
      if (!response.ok) throw new Error(`Daily outreach failed (${response.status}): ${text.slice(0, 500)}`);
      console.log("Daily outreach completed", text.slice(0, 2000));
    }));
  },
};

export default worker;

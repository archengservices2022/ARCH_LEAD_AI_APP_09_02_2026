import { getDb, getSettings } from "../../../../lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.AUTOMATION_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized automation request." }, { status: 401 });
  }

  const db = getDb();
  for (const [key, value] of [
    ["engineering_daily_target", "25"],
    ["software_daily_target", "10"],
    ["daily_total_limit", "35"],
  ] as const) {
    await db.prepare(`INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(key, value).run();
  }

  const settings = await getSettings();
  return Response.json({ ok: true, targets: { engineering: settings.engineeringTarget, software: settings.softwareTarget, total: settings.totalLimit } });
}

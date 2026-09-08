import { getDb, getSettings } from "../../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getSettings();
  return Response.json({ ok: true, dryRun: settings.dryRun });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.dryRun !== "boolean") {
      return Response.json({ ok: false, error: "dryRun must be true or false." }, { status: 400 });
    }

    const db = getDb();
    await db.prepare(`
      INSERT INTO settings(key,value) VALUES('dry_run',?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `).bind(body.dryRun ? "true" : "false").run();

    return Response.json({
      ok: true,
      dryRun: body.dryRun,
      message: body.dryRun
        ? "Dry Run enabled. Customer email sending is disabled."
        : "Live Mode enabled. Production sending is permitted subject to outreach safety checks."
    });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Unable to update Dry Run." }, { status: 500 });
  }
}

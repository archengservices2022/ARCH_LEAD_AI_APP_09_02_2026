import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1First = {
  first<T>(): Promise<T | null>;
};

type D1Binding = {
  prepare(query: string): D1First;
};

type ArchCloudflareEnv = CloudflareEnv & {
  DB: D1Binding;
};

type DashboardRow = {
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

type SettingsRow = {
  dry_run: string | null;
  engineering_target: string | null;
  software_target: string | null;
  total_limit: string | null;
};

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = (env as ArchCloudflareEnv).DB;

    if (!db) {
      return Response.json({ ok: false, error: "D1 binding DB is unavailable" }, { status: 503 });
    }

    const report = await db.prepare(`
      SELECT
        COALESCE(leads_found, 0) AS leads_found,
        COALESCE(qualified, 0) AS qualified,
        COALESCE(engineering_sent, 0) AS engineering_sent,
        COALESCE(software_sent, 0) AS software_sent,
        COALESCE(total_sent, 0) AS total_sent,
        COALESCE(followups_sent, 0) AS followups_sent,
        COALESCE(replies, 0) AS replies,
        COALESCE(interested, 0) AS interested,
        COALESCE(bounced, 0) AS bounced,
        COALESCE(failed, 0) AS failed,
        COALESCE(skipped, 0) AS skipped
      FROM daily_reports
      WHERE report_date = date('now')
      LIMIT 1
    `).first<DashboardRow>();

    const settings = await db.prepare(`
      SELECT
        MAX(CASE WHEN key = 'dry_run' THEN value END) AS dry_run,
        MAX(CASE WHEN key = 'engineering_daily_target' THEN value END) AS engineering_target,
        MAX(CASE WHEN key = 'software_daily_target' THEN value END) AS software_target,
        MAX(CASE WHEN key = 'daily_total_limit' THEN value END) AS total_limit
      FROM settings
    `).first<SettingsRow>();

    const zeroReport: DashboardRow = {
      leads_found: 0,
      qualified: 0,
      engineering_sent: 0,
      software_sent: 0,
      total_sent: 0,
      followups_sent: 0,
      replies: 0,
      interested: 0,
      bounced: 0,
      failed: 0,
      skipped: 0,
    };

    return Response.json({
      ok: true,
      report: report ?? zeroReport,
      settings: {
        dry_run: settings?.dry_run !== "false",
        engineering_target: Number(settings?.engineering_target ?? 10),
        software_target: Number(settings?.software_target ?? 10),
        total_limit: Number(settings?.total_limit ?? 20),
      },
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to read dashboard data" },
      { status: 500 }
    );
  }
}

import { getCloudflareContext } from "@opennextjs/cloudflare";

export type D1Result<T> = { results: T[] };
export type D1RunResult = { success: boolean; meta?: { last_row_id?: number; changes?: number } };
export type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  all<T>(): Promise<D1Result<T>>;
  first<T>(): Promise<T | null>;
  run(): Promise<D1RunResult>;
};
export type D1Binding = {
  prepare(query: string): D1Statement;
};

type ArchCloudflareEnv = CloudflareEnv & { DB: D1Binding };

export function getDb(): D1Binding {
  const { env } = getCloudflareContext();
  const db = (env as ArchCloudflareEnv).DB;
  if (!db) throw new Error("D1 binding DB is unavailable");
  return db;
}

export async function getSettings() {
  const db = getDb();
  const row = await db.prepare(`
    SELECT
      MAX(CASE WHEN key='dry_run' THEN value END) AS dry_run,
      MAX(CASE WHEN key='engineering_daily_target' THEN value END) AS engineering_target,
      MAX(CASE WHEN key='software_daily_target' THEN value END) AS software_target,
      MAX(CASE WHEN key='daily_total_limit' THEN value END) AS total_limit,
      MAX(CASE WHEN key='sender_email' THEN value END) AS sender_email,
      MAX(CASE WHEN key='tracking_email' THEN value END) AS tracking_email
    FROM settings
  `).first<{dry_run:string|null;engineering_target:string|null;software_target:string|null;total_limit:string|null;sender_email:string|null;tracking_email:string|null}>();
  return {
    dryRun: row?.dry_run !== "false",
    engineeringTarget: Number(row?.engineering_target ?? 10),
    softwareTarget: Number(row?.software_target ?? 10),
    totalLimit: Number(row?.total_limit ?? 20),
    senderEmail: row?.sender_email ?? "",
    trackingEmail: row?.tracking_email ?? "",
  };
}

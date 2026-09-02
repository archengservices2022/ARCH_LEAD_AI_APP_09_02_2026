import { getCloudflareContext } from "@opennextjs/cloudflare";

type SettingsRow = {
  key: string;
  value: string;
};

type D1Result<T> = {
  results: T[];
};

type D1Statement = {
  all<T>(): Promise<D1Result<T>>;
};

type D1Binding = {
  prepare(query: string): D1Statement;
};

type ArchCloudflareEnv = CloudflareEnv & {
  DB: D1Binding;
};

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = (env as ArchCloudflareEnv).DB;

    if (!db) {
      return Response.json(
        { ok: false, error: "D1 binding DB is unavailable" },
        { status: 503 }
      );
    }

    const result = await db
      .prepare("SELECT key, value FROM settings ORDER BY key")
      .all<SettingsRow>();

    const settings = Object.fromEntries(
      result.results.map((row) => [row.key, row.value])
    );

    return Response.json({ ok: true, settings });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to read D1 settings",
      },
      { status: 500 }
    );
  }
}

export const runtime = "edge";

interface CloudflareEnv {
  DB: D1Database;
}

export async function GET() {
  try {
    const env = (globalThis as typeof globalThis & { env?: CloudflareEnv }).env;

    if (!env?.DB) {
      return Response.json(
        { ok: false, error: "D1 binding DB is unavailable" },
        { status: 503 }
      );
    }

    const result = await env.DB.prepare(
      "SELECT key, value FROM settings ORDER BY key"
    ).all<{ key: string; value: string }>();

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

import { discoveryQueries, queryPlan } from "../../../../lib/discovery-plan";
import { getSettings } from "../../../../lib/db";

export async function GET() {
  const settings = await getSettings();
  return Response.json({
    ok: true,
    dryRun: settings.dryRun,
    emailSending: false,
    target: {
      engineering: settings.engineeringTarget,
      software: settings.softwareTarget,
      total: settings.totalLimit,
    },
    totalQueries: discoveryQueries.length,
    queries: queryPlan(),
    nextStep: "Connect a search provider or submit public search results to /api/discovery/run for scoring and D1 storage."
  });
}

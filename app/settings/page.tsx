import Shell from "../components/Shell";
import { getSettings } from "../../lib/db";
import DryRunControl from "./DryRunControl";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return <Shell active="/settings" dryRun={settings.dryRun}>
    <header>
      <div>
        <h1>Settings</h1>
        <p>Control whether Arch Lead AI operates in safe Dry Run mode or production Live Mode.</p>
      </div>
    </header>
    <article className="panel wide">
      <div className="panelHead">
        <div>
          <h2>Outreach Mode</h2>
          <p>Turning Dry Run OFF permits the production workflow to send approved outreach after its safety checks pass.</p>
        </div>
      </div>
      <DryRunControl initialDryRun={settings.dryRun}/>
    </article>
  </Shell>;
}

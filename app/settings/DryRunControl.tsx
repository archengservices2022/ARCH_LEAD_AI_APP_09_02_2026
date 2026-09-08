"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DryRunControl({ initialDryRun }: { initialDryRun: boolean }) {
  const [dryRun, setDryRun] = useState(initialDryRun);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function changeMode(nextDryRun: boolean) {
    if (!nextDryRun) {
      const confirmed = window.confirm("Enable LIVE MODE? Approved outreach can be sent to verified prospects through the production workflow. Existing safety, suppression and duplicate checks still apply.");
      if (!confirmed) return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/settings/dry-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun: nextDryRun }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to change mode.");
      setDryRun(nextDryRun);
      setMessage(data.message || "Mode updated.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to change mode.");
    } finally {
      setBusy(false);
    }
  }

  return <div style={{display:"grid",gap:16,maxWidth:720}}>
    <div style={{padding:18,border:"1px solid #d7deea",borderRadius:10}}>
      <div style={{fontSize:13,color:"#667085",marginBottom:6}}>CURRENT MODE</div>
      <div style={{fontSize:24,fontWeight:700}}>{dryRun ? "Dry Run ON" : "Live Mode ON"}</div>
      <p>{dryRun ? "Research, qualification, verification and draft preparation are allowed. Customer email sending is blocked." : "Production sending is enabled. Only qualified, verified, non-suppressed and non-duplicate outreach may be sent."}</p>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <button disabled={busy || dryRun} onClick={() => changeMode(true)}>Turn Dry Run ON</button>
      <button disabled={busy || !dryRun} onClick={() => changeMode(false)} style={{fontWeight:700}}>Turn Dry Run OFF / Enable Live Mode</button>
    </div>
    {message && <div>{message}</div>}
  </div>;
}

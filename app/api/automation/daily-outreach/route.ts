import { getSettings } from "../../../../lib/db";
import { POST as findNewClients } from "../../discovery/find-new-clients/route";
import { POST as verifyContacts } from "../../discovery/enrich-contacts/route";
import { POST as promoteReady } from "../../discovery/promote-ready/route";
import { POST as prepareDrafts } from "../../outreach/prepare/route";

export const runtime = "nodejs";
export const maxDuration = 300;

type Attempt={name:string;status:number;ok:boolean;data:any};
async function run(name:string,fn:()=>Promise<Response>):Promise<Attempt>{
  try{
    const response=await fn();
    const text=await response.text();
    let data:any={};
    try{data=text?JSON.parse(text):{}}catch{data={error:`${name} returned invalid JSON.`}}
    return{name,status:response.status,ok:response.ok,data};
  }catch(e){return{name,status:500,ok:false,data:{error:e instanceof Error?e.message:`${name} failed`}}}
}

export async function POST(req: Request) {
  const secret=process.env.AUTOMATION_SECRET;
  if(secret&&req.headers.get("authorization")!==`Bearer ${secret}`)return Response.json({ok:false,error:"Unauthorized automation request."},{status:401});
  const s=await getSettings();
  if(s.dryRun)return Response.json({ok:false,error:"Production automation is blocked while Dry Run is ON."},{status:409});
  try{
    const attempts:Attempt[]=[];
    let discovery=await run("web-company-discovery",findNewClients);attempts.push(discovery);

    // A prospect with no verifiable contact is a skip, not a reason to stop the daily run.
    // Retry the safe web/contact stages once so existing qualified companies can become send-ready.
    if(!discovery.ok&&s.selfHeal){
      attempts.push(await run("contact-verification-retry",verifyContacts));
      attempts.push(await run("lead-promotion-retry",promoteReady));
      attempts.push(await run("draft-preparation-retry",prepareDrafts));
    }

    const draftsPrepared=attempts.reduce((n,a)=>n+Number(a.data?.queued||a.data?.summary?.draftsPrepared||0),0);
    return Response.json({
      ok:true,
      stage:draftsPrepared>0?"web-first-send-ready":"web-first-search-complete",
      selfHeal:s.selfHeal,
      attempts,
      discovery:discovery.data,
      targets:{engineering:s.engineeringTarget,software:s.softwareTarget,total:s.totalLimit},
      draftsPrepared,
      next:"Call /api/automation/send-ready. Unverified prospects are skipped and do not block verified outreach."
    });
  }catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:"Discovery failed"},{status:500})}
}

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
    let discovery=await run("discovery",findNewClients);attempts.push(discovery);
    if(!discovery.ok&&s.selfHeal){
      // Safe repair cycle: retry verification/promotion/drafting against already discovered data,
      // then make one fresh discovery attempt. This never bypasses qualification, suppression,
      // duplicate prevention, email verification, or Gmail send safeguards.
      attempts.push(await run("repair-contact-verification",verifyContacts));
      attempts.push(await run("repair-lead-promotion",promoteReady));
      attempts.push(await run("repair-draft-preparation",prepareDrafts));
      discovery=await run("repair-discovery-retry",findNewClients);attempts.push(discovery);
    }
    if(!discovery.ok)return Response.json({ok:false,stage:"self-heal-exhausted",selfHeal:s.selfHeal,attempts,discovery:discovery.data,targets:{engineering:s.engineeringTarget,software:s.softwareTarget,total:s.totalLimit},error:"The outreach funnel remained unhealthy after its bounded automatic repair cycle. Sending is intentionally stopped rather than bypassing safety checks."},{status:502});
    return Response.json({ok:true,stage:attempts.length>1?"self-healed":"discovery-complete",selfHeal:s.selfHeal,attempts,discovery:discovery.data,targets:{engineering:s.engineeringTarget,software:s.softwareTarget,total:s.totalLimit},next:"Call /api/automation/send-ready in a separate Worker invocation."});
  }catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:"Discovery failed"},{status:500})}
}

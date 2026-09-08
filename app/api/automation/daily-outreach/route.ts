import { getSettings } from "../../../../lib/db";
import { POST as findNewClients } from "../../discovery/find-new-clients/route";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret=process.env.AUTOMATION_SECRET;
  if(secret&&req.headers.get("authorization")!==`Bearer ${secret}`)return Response.json({ok:false,error:"Unauthorized automation request."},{status:401});
  const s=await getSettings();
  if(s.dryRun)return Response.json({ok:false,error:"Production automation is blocked while Dry Run is ON."},{status:409});
  try{
    const response=await findNewClients();
    const text=await response.text();
    let discovery:any={};try{discovery=text?JSON.parse(text):{}}catch{return Response.json({ok:false,error:"Client discovery returned invalid JSON."},{status:502})}
    if(!response.ok)return Response.json({ok:false,stage:"discovery",discovery},{status:502});
    return Response.json({ok:true,stage:"discovery-complete",discovery,targets:{engineering:s.engineeringTarget,software:s.softwareTarget,total:s.totalLimit},next:"Call /api/automation/send-ready in a separate Worker invocation."});
  }catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:"Discovery failed"},{status:500})}
}

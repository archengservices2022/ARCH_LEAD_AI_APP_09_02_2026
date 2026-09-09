import{getSettings}from"../../../../lib/db";
import{GET as runEngineering}from"../mechanical/route";
import{GET as runSoftware}from"../software/route";
import{POST as runEnrichment}from"../enrich-contacts/route";
import{POST as runPromotion}from"../promote-ready/route";
import{POST as runDrafts}from"../../outreach/prepare/route";
export const maxDuration=300;
type StageResult={ok?:boolean;error?:string;results?:any[];summary?:any;verified?:number;updated?:number;enriched?:number;ready?:number;linked?:number;directVerified?:number;generalVerified?:number;queued?:number;skipped?:boolean};
async function stage(name:string,fn:()=>Promise<Response>):Promise<StageResult>{try{const response=await fn();const text=await response.text();let data:any={};try{data=text?JSON.parse(text):{}}catch{return{ok:false,error:`${name} returned an invalid response (${response.status}).`}}if(!response.ok)return{...data,ok:false,error:data.error||`${name} failed (${response.status})`};return data}catch(e){return{ok:false,error:e instanceof Error?e.message:`${name} failed`}}}
export async function POST(){try{const s=await getSettings();
 const engineering=await stage("Engineering discovery",runEngineering);
 const software=await stage("Software discovery",runSoftware);
 const discoverySucceeded=engineering.ok!==false||software.ok!==false;
 if(!discoverySucceeded)return Response.json({ok:false,dryRun:s.dryRun,emailSending:false,error:`Discovery could not complete. Engineering: ${engineering.error||"failed"}. Software: ${software.error||"failed"}.`,stages:{engineering,software}},{status:502});
 const enrichment=await stage("Contact verification",runEnrichment);
 const promotion=enrichment.ok===false?{ok:false,skipped:true,error:"Promotion skipped because contact verification did not complete."}:await stage("Lead promotion",runPromotion);
 const drafts=promotion.ok===false?{ok:false,skipped:true,error:"Draft preparation skipped because safe lead promotion did not complete."}:await stage("Draft preparation",runDrafts);
 const researched=(engineering.results?.length??0)+(software.results?.length??0),qualified=(engineering.summary?.qualified??0)+(software.summary?.qualified??0),review=(engineering.summary?.review??0)+(software.summary?.review??0),rejected=(engineering.summary?.rejected??0)+(software.summary?.rejected??0);
 const contactsVerified=(enrichment.enriched??enrichment.verified??enrichment.updated??0),newLeads=promotion.ready??0,draftsPrepared=drafts.queued??0;
 const warnings=[engineering,software,enrichment,promotion,drafts].filter(x=>x.ok===false).map(x=>x.error).filter(Boolean) as string[];
 const blockers:string[]=[];
 if(researched===0)blockers.push("No prospects were researched. Discovery sources/search logic need attention.");
 else if(qualified===0)blockers.push("Prospects were researched but none qualified. Qualification/ICP logic is blocking the funnel.");
 if(qualified>0&&contactsVerified===0)blockers.push("Qualified prospects exist but no contacts were verified. Domain/contact enrichment is blocking the funnel.");
 if(contactsVerified>0&&newLeads===0)blockers.push("Verified contacts exist but none were promoted to outreach leads. Promotion/duplicate logic needs attention.");
 if(newLeads>0&&draftsPrepared===0)blockers.push("Outreach-ready leads exist but no drafts were prepared. Draft preparation is blocking the funnel.");
 const healthy=draftsPrepared>0;
 const status=healthy?200:424;
 return Response.json({ok:healthy,partial:warnings.length>0,dryRun:s.dryRun,emailSending:false,health:{status:healthy?"GREEN":"RED",sendableWork:draftsPrepared>0,blockers},summary:{researched,qualified,review,rejected,contactsVerified,newLeads,existingLeadsLinked:promotion.linked??0,draftsPrepared},warnings,stages:{engineering,software,enrichment,promotion,drafts},message:healthy?`Client acquisition funnel GREEN: ${researched} researched, ${qualified} qualified, ${contactsVerified} contacts verified, ${draftsPrepared} drafts prepared.`:`Client acquisition funnel RED: ${blockers.join(" ")}`},{status});}catch(e){return Response.json({ok:false,emailSending:false,health:{status:"RED"},error:e instanceof Error?e.message:"AI client acquisition failed"},{status:500});}}

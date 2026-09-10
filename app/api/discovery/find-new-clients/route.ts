import{getSettings}from"../../../../lib/db";
import{GET as runEngineering}from"../mechanical/route";
import{GET as runSoftware}from"../software/route";
import{POST as runEnrichment}from"../enrich-contacts/route";
import{POST as runPromotion}from"../promote-ready/route";
import{POST as runDrafts}from"../../outreach/prepare/route";
export const maxDuration=300;
type StageResult={ok?:boolean;error?:string;results?:any[];summary?:any;verified?:number;updated?:number;enriched?:number;ready?:number;linked?:number;directVerified?:number;generalVerified?:number;queued?:number;skipped?:boolean;researchedWebsites?:number;sourceWebsitesResolved?:number;stillResearchNeeded?:number;invalidated?:number;errors?:number};
async function stage(name:string,fn:()=>Promise<Response>):Promise<StageResult>{try{const response=await fn();const text=await response.text();let data:any={};try{data=text?JSON.parse(text):{}}catch{return{ok:false,error:`${name} returned an invalid response (${response.status}).`}}if(!response.ok)return{...data,ok:false,error:data.error||`${name} failed (${response.status})`};return data}catch(e){return{ok:false,error:e instanceof Error?e.message:`${name} failed`}}}
export async function POST(){try{const s=await getSettings();
 const engineering=await stage("Engineering discovery",runEngineering);
 const software=await stage("Software discovery",runSoftware);
 const discoverySucceeded=engineering.ok!==false||software.ok!==false;
 if(!discoverySucceeded)return Response.json({ok:false,dryRun:s.dryRun,emailSending:false,error:`Discovery could not complete. Engineering: ${engineering.error||"failed"}. Software: ${software.error||"failed"}.`,stages:{engineering,software}},{status:502});
 const enrichment=await stage("Company/domain/contact verification",runEnrichment);
 const promotion=enrichment.ok===false?{ok:false,skipped:true,error:"Promotion skipped because company/domain/contact verification did not complete."}:await stage("Lead promotion",runPromotion);
 const drafts=promotion.ok===false?{ok:false,skipped:true,error:"Draft preparation skipped because safe lead promotion did not complete."}:await stage("Draft preparation",runDrafts);
 const researched=(engineering.results?.length??0)+(software.results?.length??0),qualified=(engineering.summary?.qualified??0)+(software.summary?.qualified??0),review=(engineering.summary?.review??0)+(software.summary?.review??0),rejected=(engineering.summary?.rejected??0)+(software.summary?.rejected??0);
 const contactsVerified=(enrichment.enriched??enrichment.verified??enrichment.updated??0),websitesResolved=enrichment.researchedWebsites??0,sourceWebsitesResolved=enrichment.sourceWebsitesResolved??0,researchNeeded=enrichment.stillResearchNeeded??0,newLeads=promotion.ready??0,draftsPrepared=drafts.queued??0;
 const warnings=[engineering,software,enrichment,promotion,drafts].filter(x=>x.ok===false).map(x=>x.error).filter(Boolean) as string[];
 const blockers:string[]=[];
 if(researched===0)blockers.push("No prospects were researched: discovery sources/search logic need attention.");
 else if(qualified===0)blockers.push("Prospects were researched but none qualified: ICP/qualification is blocking outreach.");
 if(qualified>0&&contactsVerified===0)blockers.push(`Qualified prospects exist but no contacts were verified after company-first research (${websitesResolved} websites resolved; ${researchNeeded} still need research). Domain/contact enrichment is blocking outreach.`);
 if(contactsVerified>0&&newLeads===0)blockers.push("Verified contacts exist but none were promoted: promotion/duplicate checks need attention.");
 if(newLeads>0&&draftsPrepared===0)blockers.push("Outreach-ready leads exist but no drafts were prepared: drafting is blocking outreach.");
 const healthy=draftsPrepared>0;
 return Response.json({ok:healthy,partial:warnings.length>0,dryRun:s.dryRun,emailSending:false,health:{status:healthy?"GREEN":"RED",sendableWork:healthy,blockers},summary:{researched,qualified,review,rejected,websitesResolved,sourceWebsitesResolved,researchNeeded,contactsVerified,newLeads,existingLeadsLinked:promotion.linked??0,draftsPrepared},warnings,stages:{engineering,software,enrichment,promotion,drafts},message:healthy?`Client acquisition funnel GREEN: ${researched} researched, ${qualified} qualified, ${websitesResolved} websites resolved, ${contactsVerified} contacts verified, ${draftsPrepared} drafts prepared.`:`Client acquisition funnel RED: ${blockers.join(" ")}`},{status:healthy?200:424});}catch(e){return Response.json({ok:false,emailSending:false,health:{status:"RED"},error:e instanceof Error?e.message:"AI client acquisition failed"},{status:500});}}

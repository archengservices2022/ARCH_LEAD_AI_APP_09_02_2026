import{getDb,getSettings}from"../../../../lib/db";
import{ENGINEERING,SOFTWARE,findApolloProspects}from"../../../../lib/apollo-prospecting";
export const runtime="nodejs";export const maxDuration=120;

export async function GET(req:Request){try{
 const secret=process.env.AUTOMATION_SECRET;if(secret&&req.headers.get("authorization")!==`Bearer ${secret}`)return Response.json({ok:false,error:"Unauthorized automation request."},{status:401});
 const s=await getSettings(),db=getDb();const runKey=`apollo-identity-v3-${new Date().toISOString().replace(/[:.]/g,"-")}`;const rr=await db.prepare(`INSERT INTO discovery_runs(run_key,status,dry_run,summary) VALUES(?,'Running',?,?)`).bind(runKey,s.dryRun?1:0,"Apollo paginated credit-free identity discovery running").run(),runId=Number(rr.meta?.last_row_id??0);
 let inserted=0,duplicates=0,invalid=0,missingWebsite=0,searchCount=0,pagesSearched=0;const results:any[]=[];const divisionCounts:{[k:string]:number}={Engineering:0,Software:0};
 for(const criteria of[ENGINEERING,SOFTWARE]){
   const target=criteria.division==='Engineering'?s.engineeringTarget:s.softwareTarget;
   for(let page=1;page<=8&&divisionCounts[criteria.division]<target;page++){
     const batch=await findApolloProspects(criteria,page);pagesSearched++;searchCount+=batch.searchCount||0;
     if(batch.error){console.error(`Apollo ${criteria.division} page ${page}`,batch.error);break}
     if(!batch.searchCount)break;
     for(const p of batch.prospects){
       if(divisionCounts[criteria.division]>=target)break;
       if(!p.company||!p.contactName){invalid++;continue}
       if(!p.website)missingWebsite++;
       const prior=await db.prepare(`SELECT id FROM leads WHERE lower(company)=lower(?) AND outreach_status IN ('Draft Ready','Queued','Approved','Sent') LIMIT 1`).bind(p.company).first<any>();if(prior){duplicates++;continue}
       const existing=await db.prepare(`SELECT id FROM discovery_candidates WHERE lower(company)=lower(?) AND source_name='Apollo Identity' LIMIT 1`).bind(p.company).first<any>();if(existing){duplicates++;continue}
       const evidence=`Apollo prospect identity: ${p.contactName}${p.title?` — ${p.title}`:""} at ${p.company}. Email not supplied or verified by Apollo; public website/contact enrichment required before outreach.`;
       await db.prepare(`INSERT INTO discovery_candidates(run_id,company,division,service,website,contact_name,contact_email,source_name,source_url,evidence,ai_score,decision,decision_reason) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(runId,p.company,p.division,p.service,p.website??null,p.contactName,null,"Apollo Identity",p.website??"https://www.apollo.io/",evidence,78,"Review","Buyer identity found in Apollo. Not yet contact-verified. Official company website, buyer fit, and a real public business contact must be independently verified before qualification, promotion, drafting, or sending.").run();
       inserted++;divisionCounts[p.division]++;results.push({company:p.company,division:p.division,contactName:p.contactName,title:p.title,website:p.website??null,emailVerified:false,next:p.website?"public-contact-enrichment":"website-lookup",page});
     }
   }
 }
 const eq=divisionCounts.Engineering||0,sq=divisionCounts.Software||0;await db.prepare(`UPDATE discovery_runs SET status='Completed',engineering_found=?,software_found=?,qualified=?,rejected=?,summary=?,completed_at=CURRENT_TIMESTAMP WHERE id=?`).bind(eq,sq,0,invalid,`Apollo Identity v3: ${eq} Engineering, ${sq} Software buyer identities stored for verification; ${duplicates} duplicates skipped across ${pagesSearched} pages. No email sent.`,runId).run();
 return Response.json({ok:true,source:"Apollo Identity v3",mode:"credit-free-paginated",dryRun:s.dryRun,emailSending:false,runId,summary:{engineering:eq,software:sq,stored:inserted,duplicates,invalid,missingWebsite,pagesSearched},apollo:{searchCount,peopleMatchCalls:0,maxPagesPerDivision:8},results,message:`Stored ${inserted} new Apollo buyer identities after paginating past prior companies. These remain Review until buyer fit, official website, and a real public business contact are independently verified.`});
}catch(e){console.error("apollo-identity",e);return Response.json({ok:false,emailSending:false,error:e instanceof Error?e.message:"Apollo identity discovery failed"},{status:500})}}

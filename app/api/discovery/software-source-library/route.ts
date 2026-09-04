import{getDb,getSettings}from"../../../../lib/db";
const starters=[
 ["Company Website/Careers","BJC HealthCare","https://www.bjc.org/"],
 ["Company Website/Careers","Schnuck Markets","https://schnucks.com/"],
 ["Company Website/Careers","Graybar","https://www.graybar.com/"],
 ["Company Website/Careers","Olin Corporation","https://olin.com/"],
 ["Company Website/Careers","Caleres","https://www.caleres.com/"],
 ["Company Website/Careers","Ameren","https://www.ameren.com/"],
] as const;
export async function POST(){try{const s=await getSettings();if(!s.dryRun)return Response.json({ok:false,error:"Software source library changes are locked to Dry Run."},{status:409});const db=getDb();let added=0;for(const[type,name,url]of starters){const r=await db.prepare(`INSERT OR IGNORE INTO discovery_sources(source_type,name,url,enabled) VALUES(?,?,?,1)`).bind(type,name,url).run();if((r.meta?.changes??0)>0)added++;}return Response.json({ok:true,added,total:starters.length,source:"Software starter library",dryRun:true,emailSending:false});}catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:"Software source library failed"},{status:500});}}

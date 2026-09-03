import{getDb,getSettings}from"../../../../lib/db";
const starters=[
 ["Company Website/Careers","Emerson","https://www.emerson.com/"],
 ["Company Website/Careers","Watlow","https://www.watlow.com/"],
 ["Company Website/Careers","Curtiss-Wright","https://www.curtisswright.com/"],
 ["Company Website/Careers","SPX FLOW","https://www.spxflow.com/"],
 ["Company Website/Careers","Terex","https://www.terex.com/"],
 ["Company Website/Careers","Timken","https://www.timken.com/"],
 ["Company Website/Careers","Dover","https://www.dovercorporation.com/"],
 ["Company Website/Careers","Nordson","https://www.nordson.com/"],
] as const;
export async function POST(){try{const s=await getSettings();if(!s.dryRun)return Response.json({ok:false,error:"Mechanical source library changes are locked to Dry Run."},{status:409});const db=getDb();let added=0;for(const[type,name,url]of starters){const r=await db.prepare(`INSERT OR IGNORE INTO discovery_sources(source_type,name,url,enabled) VALUES(?,?,?,1)`).bind(type,name,url).run();if((r.meta?.changes??0)>0)added++;}return Response.json({ok:true,added,total:starters.length,source:"Mechanical starter library",dryRun:true,emailSending:false});}catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:"Mechanical source library failed"},{status:500});}}

import{getDb,getSettings}from"../../../../lib/db";
const starters=[
 ["RFP/RFQ Portal","BidNet Direct","https://www.bidnetdirect.com/"],
 ["RFP/RFQ Portal","Public Purchase","https://www.publicpurchase.com/"],
 ["RFP/RFQ Portal","Bonfire","https://bonfirehub.com/"],
 ["RFP/RFQ Portal","OpenGov Procurement","https://procurement.opengov.com/"],
 ["RFP/RFQ Portal","DemandStar","https://www.demandstar.com/"],
 ["RFP/RFQ Portal","PlanetBids","https://pbsystem.planetbids.com/"],
 ["RFP/RFQ Portal","Ion Wave","https://www.ionwave.net/"],
] as const;
export async function POST(){const s=await getSettings();if(!s.dryRun)return Response.json({ok:false,error:"Source library changes are locked to Dry Run."},{status:409});const db=getDb();let added=0;for(const[x,n,u]of starters){const r=await db.prepare(`INSERT OR IGNORE INTO discovery_sources(source_type,name,url,enabled) VALUES(?,?,?,1)`).bind(x,n,u).run();if((r.meta?.changes??0)>0)added++;}return Response.json({ok:true,added,total:starters.length});}

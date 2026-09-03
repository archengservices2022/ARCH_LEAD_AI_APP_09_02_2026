import type { DiscoveryCandidateInput, Division } from "./discovery";

type BraveResult={title?:string;url?:string;description?:string;profile?:{long_name?:string}};
type BraveResponse={web?:{results?:BraveResult[]}};
const portals=["bidnetdirect.com","publicpurchase.com","bonfirehub.com","opengov.com","demandstar.com","planetbids.com","ionwave.net"];
const searches:[Division,string][]=[
 ["Engineering","(RFP OR RFQ OR bid OR solicitation) (mechanical engineering OR CAD OR drafting OR fabrication drawings OR structural engineering OR equipment design)"],
 ["Software","(RFP OR RFQ OR bid OR solicitation) (custom software OR CRM OR portal OR web application OR workflow automation OR field service OR integration)"],
];
function buyer(r:BraveResult){if(r.profile?.long_name)return r.profile.long_name;try{return new URL(r.url??"").hostname.replace(/^www\./,"")}catch{return "Public buyer"}}
export async function searchRfpPortals(apiKey:string,perQuery=8){const out:DiscoveryCandidateInput[]=[];const seen=new Set<string>();for(const [division,base] of searches){for(const domain of portals){const q=`site:${domain} ${base}`;const p=new URLSearchParams({q,count:String(Math.min(perQuery,10)),text_decorations:"false",safesearch:"moderate"});const res=await fetch(`https://api.search.brave.com/res/v1/web/search?${p}`,{headers:{Accept:"application/json","X-Subscription-Token":apiKey},cache:"no-store"});if(!res.ok)throw new Error(`RFP portal search returned ${res.status}`);const data=await res.json() as BraveResponse;for(const r of data.web?.results??[]){if(!r.url||seen.has(r.url))continue;seen.add(r.url);const evidence=`${r.title??""}. ${r.description??""}`.trim();if(evidence.length<40)continue;out.push({company:buyer(r),division,service:r.title||"RFP/RFQ opportunity",sourceName:`RFP/RFQ Portal: ${domain}`,sourceUrl:r.url,evidence});}}}return out;}

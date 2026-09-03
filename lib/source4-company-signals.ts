import type { DiscoveryCandidateInput, Division } from "./discovery";

type BraveResult={title?:string;url?:string;description?:string;profile?:{long_name?:string}};
type BraveResponse={web?:{results?:BraveResult[]}};

const searches:[Division,string,string][]=[
 ["Engineering","Engineering hiring overflow","(site:jobs.lever.co OR site:greenhouse.io OR careers OR jobs) (SolidWorks OR Autodesk Inventor OR AutoCAD OR mechanical design OR CAD designer OR drafter)"],
 ["Engineering","Facility and production expansion","(new facility OR expansion OR new production line OR plant expansion) (mechanical engineering OR CAD OR equipment design OR fabrication)"],
 ["Software","Operations pain signals","(careers OR jobs OR company) (manual process OR spreadsheets OR Excel OR scheduling OR dispatch OR work orders OR CRM administrator OR integration)"],
 ["Software","Growth and system change","(opening new locations OR expansion OR acquisition OR modernization) (CRM OR portal OR field service OR scheduling OR workflow automation OR software implementation)"],
];
function company(r:BraveResult){if(r.profile?.long_name)return r.profile.long_name;try{return new URL(r.url??"").hostname.replace(/^www\./,"")}catch{return r.title?.split(/[|–—-]/)[0]?.trim()||"Unknown company"}}
export async function searchCompanySignals(apiKey:string,perQuery=5){const out:DiscoveryCandidateInput[]=[];const seen=new Set<string>();for(const [division,label,q] of searches){const p=new URLSearchParams({q,count:String(perQuery),text_decorations:"false",safesearch:"moderate"});const res=await fetch(`https://api.search.brave.com/res/v1/web/search?${p}`,{headers:{Accept:"application/json","X-Subscription-Token":apiKey},cache:"no-store"});if(!res.ok)throw new Error(`Company signal search returned ${res.status}`);const data=await res.json() as BraveResponse;for(const r of data.web?.results??[]){if(!r.url||seen.has(r.url))continue;seen.add(r.url);const evidence=`${r.title??""}. ${r.description??""}`.trim();if(evidence.length<40)continue;out.push({company:company(r),division,service:label,website:(()=>{try{return new URL(r.url!).origin}catch{return undefined}})(),sourceName:"Company Website/Careers",sourceUrl:r.url,evidence});}}return out;}

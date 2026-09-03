export type CrawledPage={url:string;title:string;text:string;links:string[]};

function decodeHtml(value:string){return value.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">");}
function stripHtml(html:string){return decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());}
function titleOf(html:string){const m=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);return m?stripHtml(m[1]).slice(0,180):"";}
function linksOf(html:string,base:string){const out=new Set<string>();const re=/href=["']([^"'#]+)["']/gi;let m:RegExpExecArray|null;while((m=re.exec(html))){try{const u=new URL(m[1],base);if(u.protocol!=="http:"&&u.protocol!=="https:")continue;if(u.hostname!==new URL(base).hostname)continue;out.add(u.toString());}catch{}}return [...out].slice(0,80);}

export async function crawlPage(url:string):Promise<CrawledPage|null>{
 try{const res=await fetch(url,{headers:{"User-Agent":"ArchLeadAI/1.0 (+https://archengineeringservices.com)",Accept:"text/html,application/xhtml+xml"},redirect:"follow",cache:"no-store"});if(!res.ok)return null;const type=res.headers.get("content-type")||"";if(!type.includes("text/html")&&!type.includes("application/xhtml+xml"))return null;const html=(await res.text()).slice(0,750000);return{url:res.url,title:titleOf(html),text:stripHtml(html).slice(0,30000),links:linksOf(html,res.url)};}catch{return null;}
}

export function parseSeedList(value:string|undefined|null){if(!value)return[];return value.split(/[\n,]+/).map(x=>x.trim()).filter(Boolean).filter(x=>{try{const u=new URL(x);return u.protocol==="https:"||u.protocol==="http:"}catch{return false}}).slice(0,25);}

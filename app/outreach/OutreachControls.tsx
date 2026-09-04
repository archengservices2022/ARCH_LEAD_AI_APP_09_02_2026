"use client";
import{useState}from"react";
export default function OutreachControls(){
 const[busy,setBusy]=useState("");const[msg,setMsg]=useState("");const[ok,setOk]=useState<boolean|null>(null);
 async function call(path:string,reload=false,confirmText?:string){if(confirmText&&!window.confirm(confirmText))return;setBusy(path);setMsg("");setOk(null);try{const r=await fetch(path,{method:"POST",headers:{Accept:"application/json"},cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Action failed");setOk(true);setMsg(j.message||"Completed. No email sent.");if(reload)setTimeout(()=>location.reload(),1400);}catch(e){setOk(false);setMsg(e instanceof Error?e.message:"Action failed");}finally{setBusy("");}}
 return <div><div className="discoveryControls">
  <button disabled={!!busy} onClick={()=>call("/api/outreach/gmail-check")}>{busy.includes("gmail-check")?"Testing Gmail...":"Test Gmail Connection"}</button>
  <button disabled={!!busy} onClick={()=>call("/api/outreach/test-send",false,"Send exactly ONE real test email from skota@archengineeringservices.com to archengservices2022@gmail.com?")}>{busy.includes("test-send")?"Sending 1 Test Email...":"Send 1 Test Email"}</button>
  <button disabled={!!busy} onClick={()=>call("/api/discovery/enrich-contacts")}>{busy.includes("enrich")?"Enriching - please wait...":"Enrich Qualified Contacts"}</button>
  <button disabled={!!busy} onClick={()=>call("/api/discovery/promote-ready")}>{busy.includes("promote")?"Checking - please wait...":"Promote Verified Leads"}</button>
  <button disabled={!!busy} onClick={()=>call("/api/outreach/prepare",true)}>{busy.includes("prepare")?"Preparing - please wait...":"Prepare Outreach Drafts"}</button>
  <button disabled={!!busy} onClick={()=>call("/api/outreach/regenerate",true)}>{busy.includes("regenerate")?"Updating drafts...":"Regenerate Queued Drafts"}</button>
 </div>{busy&&<div style={{marginTop:14,padding:"12px 16px",border:"1px solid #cbd5e1",borderRadius:8,background:"#f8fafc",fontWeight:600}}>Processing... Please wait. Do not click another button.</div>}{msg&&<div role="status" style={{marginTop:14,padding:"14px 16px",border:`1px solid ${ok?"#86b99a":"#d99a9a"}`,borderRadius:8,background:ok?"#f1f8f3":"#fff4f4",fontWeight:700,lineHeight:1.5}}>Result: {msg}</div>}</div>;
}

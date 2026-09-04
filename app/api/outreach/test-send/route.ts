import{getSettings}from"../../../../lib/db";
import{applyGmailDivisionLabel,gmailConfigured,sendGmailMessage,verifyGmailSendAs}from"../../../../lib/gmail";
export const runtime="nodejs";
export const maxDuration=30;
const TEST_RECIPIENT="archengservices2022@gmail.com";
export async function POST(){
 try{
  const s=await getSettings();
  if(!gmailConfigured())return Response.json({ok:false,error:"Gmail OAuth is not configured."},{status:409});
  if(!s.senderEmail)return Response.json({ok:false,error:"Sender email is not configured."},{status:409});
  const alias=await verifyGmailSendAs(s.senderEmail);
  if(!alias.verified)return Response.json({ok:false,error:`Configured sender ${s.senderEmail} is not an accepted Gmail Send-As alias.`},{status:409});
  const subject="Arch Engineering Gmail Send Test";
  const body=`Hello,\n\nThis is a controlled test email from the Arch Lead AI outreach system.\n\nFrom: ${s.senderEmail}\nTo: ${TEST_RECIPIENT}\nDivision: Engineering\n\nIf you received this message, the Gmail sending path is working correctly.\n\nBest regards,\nSridhar Kota\nArch Engineering Services`;
  const g=await sendGmailMessage({sender:s.senderEmail,recipient:TEST_RECIPIENT,subject,body});
  let labelStatus="Engineering label applied";
  try{await applyGmailDivisionLabel(g.messageId,"Engineering")}catch{labelStatus="Email sent; Engineering label could not be applied"}
  return Response.json({ok:true,message:`TEST EMAIL SENT: ${s.senderEmail} -> ${TEST_RECIPIENT}. ${labelStatus}. Exactly 1 email was sent.`});
 }catch(e){console.error("outreach-test-send",e);return Response.json({ok:false,error:e instanceof Error?e.message:"Test send failed"},{status:500})}
}

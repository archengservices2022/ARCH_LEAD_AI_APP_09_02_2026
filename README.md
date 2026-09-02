# Arch Lead AI

Clean lead intelligence, CRM and outreach system for Arch Engineering Services.

## Daily policy
- Engineering/Mechanical: maximum 10 new outreach emails/day.
- Software/Automation: maximum 10 new outreach emails/day.
- Total maximum: 20/day.
- Never lower qualification standards merely to reach the quota.
- Dry Run is enabled by default.

## Mail architecture
- Customer sender: `skota@archengineeringservices.com`
- Tracking mailbox: `archengservices2022@gmail.com`
- All customer outreach: `Arch Outreach`
- Engineering/Mechanical outreach: `Engineering`
- Software outreach: `Software`
- Cloudflare D1 is the CRM source of truth. Gmail labels are the mail audit/organization layer.
- A label/archive failure after a successful customer send must never cause a duplicate resend.

## Application areas
Dashboard, Lead Discovery, CRM Leads, Outreach, Follow-ups & Replies, Daily Reports.

## Safety
Do not commit Gmail OAuth credentials, Cloudflare tokens, passwords, refresh tokens or session secrets. Configure secrets in Cloudflare only. Keep real sending disabled until discovery, D1 recording, Gmail delivery, tracking labels, reply matching and follow-up cancellation have all passed dry-run/controlled testing.

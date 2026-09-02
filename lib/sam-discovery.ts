import type { DiscoveryCandidateInput, Division } from "./discovery";

const SAM_URL = "https://api.sam.gov/opportunities/v2/search";

type SamOpportunity = {
  noticeId?: string;
  title?: string;
  solicitationNumber?: string;
  fullParentPathName?: string;
  department?: string;
  subTier?: string;
  office?: string;
  postedDate?: string;
  responseDeadLine?: string;
  type?: string;
  naicsCode?: string;
  description?: string;
  uiLink?: string;
};

type SamResponse = { opportunitiesData?: SamOpportunity[]; totalRecords?: number };

const engineering = ["mechanical", "cad", "autodesk", "inventor", "solidworks", "fabrication", "shop drawing", "drafting", "engineering design", "structural", "plant engineering", "reverse engineering"];
const software = ["software", "application development", "web application", "automation", "crm", "portal", "integration", "programming", "digital transformation", "information system", "data system"];

function includesAny(text: string, terms: string[]) { return terms.some((x) => text.includes(x)); }

function classify(op: SamOpportunity): Division | null {
  const text = `${op.title ?? ""} ${op.description ?? ""} ${op.naicsCode ?? ""}`.toLowerCase();
  const e = includesAny(text, engineering);
  const s = includesAny(text, software) || String(op.naicsCode ?? "").startsWith("54151");
  if (e && !s) return "Engineering";
  if (s) return "Software";
  return null;
}

function fmt(d: Date) { return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${d.getFullYear()}`; }

export async function searchSam(apiKey: string, days = 14, limit = 50) {
  const to = new Date();
  const from = new Date(to.getTime() - Math.max(1, Math.min(days, 30)) * 86400000);
  const params = new URLSearchParams({ api_key: apiKey, postedFrom: fmt(from), postedTo: fmt(to), limit: String(Math.min(limit, 100)), offset: "0" });
  const response = await fetch(`${SAM_URL}?${params.toString()}`, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`SAM.gov API returned ${response.status}`);
  const data = await response.json() as SamResponse;
  const raw = data.opportunitiesData ?? [];
  const candidates: DiscoveryCandidateInput[] = [];
  for (const op of raw) {
    const division = classify(op);
    if (!division || !op.title) continue;
    const buyer = op.fullParentPathName || [op.department, op.subTier, op.office].filter(Boolean).join(" > ") || "U.S. Government agency";
    const sourceUrl = op.uiLink || (op.noticeId ? `https://sam.gov/opp/${op.noticeId}/view` : "https://sam.gov/opportunities");
    const evidence = [
      `SAM.gov public contract opportunity: ${op.title}.`,
      op.solicitationNumber ? `Solicitation ${op.solicitationNumber}.` : "",
      op.postedDate ? `Posted ${op.postedDate}.` : "",
      op.responseDeadLine ? `Response deadline ${op.responseDeadLine}.` : "",
      op.type ? `Notice type ${op.type}.` : "",
      op.naicsCode ? `NAICS ${op.naicsCode}.` : ""
    ].filter(Boolean).join(" ");
    candidates.push({ company: buyer, division, service: op.title, sourceName: "SAM.gov", sourceUrl, evidence });
  }
  return { totalRecords: data.totalRecords ?? raw.length, fetched: raw.length, candidates };
}

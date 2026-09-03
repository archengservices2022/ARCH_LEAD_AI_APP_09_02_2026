export type Division = "Engineering" | "Software";

export type DiscoveryCandidateInput = {
  company: string;
  division: Division;
  service?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  sourceName?: string;
  sourceUrl?: string;
  evidence?: string;
};

export type ScoredCandidate = DiscoveryCandidateInput & {
  score: number;
  decision: "Qualified" | "Review" | "Rejected";
  reason: string;
};

const engineeringSignals = [
  "autodesk inventor","inventor","solidworks","autocad","cad designer","cad drafter","mechanical drafter","mechanical design engineer","mechanical designer","mechanical design","drafting","shop drawing","fabrication drawing","manufacturing drawing","production drawing","assembly drawing","detail drawing","weldment drawing","bom","bill of materials","reverse engineering","steel detailing","plant engineering","3d model","product design","equipment design","machine design","custom equipment","material handling","design automation","cad automation","ilogic"
];
const softwareSignals = [
  "custom software","automation","web application","mobile app","crm","dashboard","workflow","integration","api","field service","scheduling","portal","inventory system","digital transformation"
];
const buyerSignals = [
  "rfp","rfq","request for proposal","request for quote","seeking","looking for","need","needs","vendor","contractor","consultant","quote","proposal","project","upgrade","replace","implement","develop","design support","engineering support","drafting support","contract engineer","contract designer","subcontract","outsource","overflow","backlog","urgent hiring","multiple openings","hiring","opening","new facility","new production line","expansion"
];
const negativeSignals = ["student","tutorial","course","job seeker","resume","free template","personal project"];
const providerSignals = ["we provide engineering services","we provide cad services","our cad services","our drafting services","engineering services company","contact us for cad","we specialize in cad"];

function hits(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term));
}

export function scoreCandidate(input: DiscoveryCandidateInput): ScoredCandidate {
  const text = `${input.service ?? ""} ${input.evidence ?? ""} ${input.sourceName ?? ""}`.toLowerCase();
  const serviceHits = hits(text, input.division === "Engineering" ? engineeringSignals : softwareSignals);
  const buyerHits = hits(text, buyerSignals);
  const negativeHits = hits(text, negativeSignals);
  const providerHits = hits(text, providerSignals);

  let score = 15;
  score += Math.min(35, serviceHits.length * 8);
  score += Math.min(35, buyerHits.length * 9);
  if (input.website) score += 4;
  if (input.sourceUrl) score += 4;
  if (input.contactEmail) score += 10;
  if (buyerHits.length === 0) score -= 20;
  score -= Math.min(35, negativeHits.length * 15);
  score -= Math.min(30, providerHits.length * 15);
  score = Math.max(0, Math.min(100, score));

  let decision: ScoredCandidate["decision"] = score >= 70 ? "Qualified" : score >= 50 ? "Review" : "Rejected";
  if (buyerHits.length === 0 && decision === "Qualified") decision = "Review";
  const positives = [...serviceHits.slice(0, 3), ...buyerHits.slice(0, 3)];
  const reason = positives.length
    ? `${decision}: matched ${positives.join(", ")}${buyerHits.length ? "; buyer intent detected" : "; buyer intent not yet confirmed"}${input.contactEmail ? "; contact email available" : ""}.`
    : `${decision}: insufficient buyer/service evidence for automatic qualification.`;

  return { ...input, score, decision, reason };
}

export function validateCandidate(value: unknown): DiscoveryCandidateInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.company !== "string" || !v.company.trim()) return null;
  if (v.division !== "Engineering" && v.division !== "Software") return null;
  const str = (key: string) => typeof v[key] === "string" ? String(v[key]).trim() || undefined : undefined;
  return {
    company: v.company.trim(),
    division: v.division,
    service: str("service"),
    website: str("website"),
    contactName: str("contactName"),
    contactEmail: str("contactEmail")?.toLowerCase(),
    sourceName: str("sourceName"),
    sourceUrl: str("sourceUrl"),
    evidence: str("evidence"),
  };
}

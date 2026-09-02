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
  "autodesk inventor","solidworks","autocad","cad","mechanical design","drafting","shop drawing","fabrication drawing","bom","reverse engineering","steel detailing","plant engineering","3d model","product design","design automation"
];
const softwareSignals = [
  "custom software","automation","web application","mobile app","crm","dashboard","workflow","integration","api","field service","scheduling","portal","inventory system","digital transformation"
];
const buyerSignals = [
  "rfp","request for proposal","seeking","looking for","need","needs","vendor","contractor","consultant","quote","proposal","project","upgrade","replace","implement","develop","design","engineering services"
];
const negativeSignals = ["student","tutorial","course","job seeker","resume","free template","personal project"];

function hits(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term));
}

export function scoreCandidate(input: DiscoveryCandidateInput): ScoredCandidate {
  const text = `${input.service ?? ""} ${input.evidence ?? ""} ${input.sourceName ?? ""}`.toLowerCase();
  const serviceHits = hits(text, input.division === "Engineering" ? engineeringSignals : softwareSignals);
  const buyerHits = hits(text, buyerSignals);
  const negativeHits = hits(text, negativeSignals);

  let score = 20;
  score += Math.min(35, serviceHits.length * 9);
  score += Math.min(30, buyerHits.length * 8);
  if (input.website) score += 5;
  if (input.sourceUrl) score += 5;
  if (input.contactEmail) score += 10;
  score -= Math.min(35, negativeHits.length * 15);
  score = Math.max(0, Math.min(100, score));

  const decision: ScoredCandidate["decision"] = score >= 70 ? "Qualified" : score >= 50 ? "Review" : "Rejected";
  const positives = [...serviceHits.slice(0, 3), ...buyerHits.slice(0, 2)];
  const reason = positives.length
    ? `${decision}: matched ${positives.join(", ")}${input.contactEmail ? "; contact email available" : ""}.`
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

import type { Division } from "./discovery";

export type DiscoveryQuery = {
  division: Division;
  label: string;
  query: string;
  intent: "buyer" | "rfp" | "project";
};

export const discoveryQueries: DiscoveryQuery[] = [
  { division: "Engineering", label: "Mechanical CAD projects", query: "mechanical CAD design services RFP OR RFQ OR seeking contractor", intent: "rfp" },
  { division: "Engineering", label: "Autodesk Inventor work", query: "Autodesk Inventor design project vendor OR contractor OR services", intent: "project" },
  { division: "Engineering", label: "Fabrication drawings", query: "fabrication drawings shop drawings mechanical engineering RFP OR RFQ", intent: "rfp" },
  { division: "Engineering", label: "Plant / structural support", query: "plant engineering structural support CAD contractor project", intent: "buyer" },
  { division: "Software", label: "Custom business software", query: "custom software development RFP OR RFQ small business", intent: "rfp" },
  { division: "Software", label: "Workflow automation", query: "workflow automation software vendor seeking implementation", intent: "buyer" },
  { division: "Software", label: "CRM / portal projects", query: "CRM portal web application project RFP OR vendor", intent: "project" },
  { division: "Software", label: "Field service systems", query: "field service software custom application RFP contractor", intent: "rfp" },
];

export function queryPlan() {
  return {
    engineering: discoveryQueries.filter((q) => q.division === "Engineering"),
    software: discoveryQueries.filter((q) => q.division === "Software"),
  };
}

// src/utils/agentsConfig.ts
// Shared agent constants — full AGENTS_DEF with bilingual metadata
// NO JSX — pure TypeScript

export interface AgentDef {
  id: string;
  name: string;
  short: string;
  color: string;
  personName: { fr: string; en: string };
  personTitle: { fr: string; en: string };
  domain: { fr: string; en: string };
  avatar: string;
  webSearch?: boolean;
  systemPrompt?: string;
}

export const AGENTS_DEF: AgentDef[] = [
  {
    id: "TaxAgent",
    name: "Sophie Mercier",
    short: "SM",
    color: "#10B981",
    personName: { fr: "Sophie Mercier", en: "Sophie Mercier" },
    personTitle: { fr: "Fiscaliste principale · CPA, M.Fisc.", en: "Senior Tax Specialist · CPA, M.Tax." },
    domain: { fr: "Fiscalité, impôts, TPS/TVQ, RS&DE", en: "Tax, corporate income, GST/HST, SR&ED" },
    avatar: "👩",
    webSearch: false,
  },
  {
    id: "AuditAgent",
    name: "Alexandre Bouchard",
    short: "AB",
    color: "#3B82F6",
    personName: { fr: "Alexandre Bouchard", en: "Alexandre Bouchard" },
    personTitle: { fr: "Auditeur certifié senior · CPA-CA", en: "Senior Certified Auditor · CPA-CA" },
    domain: { fr: "Audit, risque, contrôle interne", en: "Audit, risk, internal control" },
    avatar: "👨",
    webSearch: false,
  },
  {
    id: "CashFlowAgent",
    name: "Natalie Chen",
    short: "NC",
    color: "#8B5CF6",
    personName: { fr: "Natalie Chen", en: "Natalie Chen" },
    personTitle: { fr: "Directrice trésorerie · CTP", en: "Treasury Director · CTP" },
    domain: { fr: "Cashflow, liquidité, trésorerie", en: "Cashflow, liquidity, treasury management" },
    avatar: "👩",
    webSearch: false,
  },
  {
    id: "ComplianceAgent",
    name: "Isabelle Roy",
    short: "IR",
    color: "#F59E0B",
    personName: { fr: "Isabelle Roy", en: "Isabelle Roy" },
    personTitle: { fr: "Conseillère conformité & vie privée · LL.M., DPO", en: "Compliance & Privacy Advisor · LL.M., DPO" },
    domain: { fr: "Loi 25, conformité, données personnelles", en: "Law 25, compliance, personal data" },
    avatar: "👩",
    webSearch: true,
  },
  {
    id: "FinancialAgent",
    name: "Marc Tremblay",
    short: "MT",
    color: "#06B6D4",
    personName: { fr: "Marc Tremblay", en: "Marc Tremblay" },
    personTitle: { fr: "Analyste financier senior · CFA", en: "Senior Financial Analyst · CFA" },
    domain: { fr: "Ratios, états financiers, diagnostics", en: "Ratios, financial statements, diagnostics" },
    avatar: "👨",
    webSearch: false,
  },
  {
    id: "InvestmentAgent",
    name: "Sarah Blackwell",
    short: "SB",
    color: "#EC4899",
    personName: { fr: "Sarah Blackwell", en: "Sarah Blackwell" },
    personTitle: { fr: "Analyste investissement & M&A · CFA, MBA", en: "Investment & M&A Analyst · CFA, MBA" },
    domain: { fr: "Valorisation, DCF, M&A", en: "Valuation, DCF, M&A" },
    avatar: "👩",
    webSearch: false,
  },
  {
    id: "OCRAgent",
    name: "Jean-Francois Lebel",
    short: "JF",
    color: "#F97316",
    personName: { fr: "Jean-François Lebel", en: "Jean-Francois Lebel" },
    personTitle: { fr: "Spécialiste extraction & traitement documentaire", en: "Document Extraction & Processing Specialist" },
    domain: { fr: "OCR, extraction, traitement de documents scannés", en: "OCR, extraction, scanned document processing" },
    avatar: "📄",
    webSearch: false,
  },
  {
    id: "VeilleAgent",
    name: "Emilie Cote",
    short: "EC",
    color: "#14B8A6",
    personName: { fr: "Émilie Côté", en: "Emilie Cote" },
    personTitle: { fr: "Analyste veille réglementaire & sectorielle", en: "Regulatory & Sector Intelligence Analyst" },
    domain: { fr: "Veille réglementaire et sectorielle", en: "Regulatory and sector intelligence" },
    avatar: "👩",
    webSearch: true,
  },
  {
    id: "SubventionsAgent",
    name: "Patrick Gagnon",
    short: "PG",
    color: "#A855F7",
    personName: { fr: "Patrick Gagnon", en: "Patrick Gagnon" },
    personTitle: { fr: "Spécialiste subventions & programmes gouvernementaux", en: "Grants & Government Programs Specialist" },
    domain: { fr: "Programmes d'aide, grants, crédits gouvernementaux", en: "Aid programs, grants, government credits" },
    avatar: "👨",
    webSearch: true,
  },
];

// Lookup map by id
export const A_STUDIO: Record<string, AgentDef> = Object.fromEntries(
  AGENTS_DEF.map(a => [a.id, a])
);

// AGENTS_STUDIO: lightweight version for sidebar/roster
export const AGENTS_STUDIO = AGENTS_DEF.map(a => ({
  id: a.id,
  name: a.name,
  short: a.short,
  color: a.color,
}));

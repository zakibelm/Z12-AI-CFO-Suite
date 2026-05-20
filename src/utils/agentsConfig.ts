// Shared agent constants - auto-extracted from AGENTS_DEF
// NO JSX - pure TypeScript

export interface AgentStudioEntry {
  id: string;
  name: string;
  short: string;
  color: string;
}

export const AGENTS_STUDIO: AgentStudioEntry[] = [
  { id: "TaxAgent", name: "Sophie Mercier", short: "SM", color: "#10B981" },
  { id: "AuditAgent", name: "Alexandre Bouchard", short: "AB", color: "#3B82F6" },
  { id: "CashFlowAgent", name: "Natalie Chen", short: "NC", color: "#8B5CF6" },
  { id: "ComplianceAgent", name: "Isabelle Roy", short: "IR", color: "#F59E0B" },
  { id: "FinancialAgent", name: "Marc Tremblay", short: "MT", color: "#06B6D4" },
  { id: "InvestmentAgent", name: "Sarah Blackwell", short: "SB", color: "#EC4899" },
  { id: "OCRAgent", name: "Jean-Francois Lebel", short: "JF", color: "#F97316" },
  { id: "VeilleAgent", name: "Emilie Cote", short: "EC", color: "#14B8A6" },
  { id: "SubventionsAgent", name: "Patrick Gagnon", short: "PG", color: "#A855F7" },
];

export const A_STUDIO: Record<string, AgentStudioEntry> = Object.fromEntries(
  AGENTS_STUDIO.map(a => [a.id, a])
);

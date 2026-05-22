import { FILE_CATEGORY } from "./workflow";
// src/utils/fileUtils.ts
// Extracted from App.tsx — utility functions for file handling

export async function extractTextPreview(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const cat = FILE_CATEGORY(ext);
  // Hard limit: never extract images/video/audio client-side
  if (["image","video","audio","archive","email"].includes(cat)) return null;
  // Text files: full extraction
  if (cat === "text") {
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = e => {
        const full = (e.target?.result as string) || "";
        resolve({ text: full.slice(0, 600), words: full.split(/\s+/).filter(w=>w.length>1).length, source:"client" });
      };
      r.onerror = () => resolve(null);
      r.readAsText(file);
    });
  }
  // PDF: attempt basic text-stream extraction (works on many non-scanned PDFs)
  if (cat === "pdf") {
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = e => {
        try {
          const s = (e.target?.result as string) || "";
          // Extract visible text between BT...ET markers and parentheses
          const parens = (s.match(/\(([^)]{3,80})\)/g) || []).map(m => m.slice(1,-1)).filter(t => /[a-zA-Zé-é]{3}/.test(t));
          const text = parens.join(" ").replace(/\\n/g," ").replace(/\s{2,}/g," ").slice(0,600);
          const words = text.split(/\s+/).filter(w=>w.length>2).length;
          resolve(text.length > 30 ? { text, words, source:"client" } : { text:"", words:0, source:"server-only" });
        } catch { resolve(null); }
      };
      r.onerror = () => resolve(null);
      r.readAsBinaryString(file);
    });
  }
  // DOCX/PPTX/XLSX — inform user extraction will happen server-side
  return { text:"", words:0, source:"server-only" };
}

// Inspired by VectDocs smart file classification — extended with finance keywords
export function detectAgentFromFile(filename, previewText = "") {
  const s = (filename + " " + previewText).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  if (/t1|t2|tps|tvq|gst|hst|impot|tax|cra|fiscal|revenu.quebec|declaration|amortissement|deduction/.test(s)) return "TaxAgent";
  if (/audit|ifrs|aspe|verification|controle.interne|cpa|materialite|norme/.test(s)) return "AuditAgent";
  if (/tresorerie|cash|liquidite|flux|budget|prevision|bfr/.test(s)) return "CashFlowAgent";
  if (/conformite|loi.25|casl|pipeda|politique|donnees.personnelles|consentement|efvp/.test(s)) return "ComplianceAgent";
  if (/ratio|analyse.financiere|benchmark|baiia|ebitda|marge|solvabilite|etats.financiers/.test(s)) return "FinancialAgent";
  if (/investissement|roi|tir|van|dcf|portefeuille|acquisition/.test(s)) return "InvestmentAgent";
  if (/scan|ocr|photo|facture.num|releve.num|manuscrit/.test(s)) return "OCRAgent";
  if (/veille|actualite|mise.a.jour|bulletin|circulaire|nouveaute/.test(s)) return "VeilleAgent";
  if (/subvention|aide.financiere|programme|grant|bourse|sred|irap/.test(s)) return "SubventionsAgent";
  return "FinancialAgent";
}

// Inspired by VectDocs — lightweight language detection (no external lib)
export function detectLanguage(text) {
  if (!text || text.length < 30) return "unknown";
  const fr = (text.match(/\b(les|des|dans|pour|avec|sur|est|sont|une|qui|que|mais|par|nous|vous|ils|elles|cette|votre|notre)\b/gi)||[]).length;
  const en = (text.match(/\b(the|and|for|with|that|this|are|from|have|been|will|your|their|not|can|all|been|more)\b/gi)||[]).length;
  return fr > en ? "fr" : en > fr ? "en" : "unknown";
}

// Estimate chunks before server processes (VectDocs-inspired schema enrichment)
export const estimateChunks = words => Math.max(1, Math.ceil(words / 375)); // ~500 tokens H 375 words

// Pipeline stage labels for upload progress
export function uploadStageLabel(progress) {
  if (progress < 15) return "Lecture...";
  if (progress < 35) return "Extraction texte...";
  if (progress < 60) return "Chunking (500 tok)...";
  if (progress < 85) return "Embedding HF...";
  if (progress < 100) return "Stockage pgvector...";
  return null;
}

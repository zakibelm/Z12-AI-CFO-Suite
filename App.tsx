/**
 * Z12 AI CFO Suite — v3.1
 * ZAKI OS Platform · May 2026
 *
 * ── Intégrations VectDocs appliquées ──────────────────────────────────────────
 * ✅ extractTextPreview()   — lecture client-side instantanée (TXT/CSV/JSON/PDF)
 * ✅ detectAgentFromFile()  — auto-assignation agent depuis nom + contenu
 * ✅ detectLanguage()       — détection FR/EN depuis le texte extrait
 * ✅ estimateChunks()       — estimation chunks avant indexation serveur
 * ✅ Folder batch upload    — showDirectoryPicker() avec fallback gracieux
 * ✅ EmbeddedDocument schema enrichi : fileType | words | language | preview
 * ✅ Pipeline stages labels — "Lecture → Extraction → Chunking → Embedding → Indexé"
 * ✅ Agent badge overrideable dans la queue d'upload
 * ✅ Documents : Search + Sort + Expandable preview panel + Delete
 *
 * ── Héritage v3.0 ─────────────────────────────────────────────────────────────
 * ✅ useLocalStorage — persistance complète
 * ✅ Auto-routing 2 niveaux (regex rapide + fallback Claude API)
 * ✅ 9 agents : 7 RAG + VeilleAgent + SubventionsAgent (web search temps réel)
 * ✅ callClaudeWithWebSearch() — outil web_search Anthropic pour veille/subventions
 * ✅ Settings éditables par agent (modèle + prompt)
 * ✅ FR/EN + Dark/Light mode
 * ✅ Pipeline RAG view + Governance view
 * ✅ Copy/Export/Delete conversations
 * ✅ Quick prompts par agent
 * ✅ useMemo/useCallback — zéro re-render inutile
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const DARK  = { bg:"#070B14",sb:"#0C1220",card:"#0F1929",border:"#1C2D42",accent:"#10B981",gold:"#F59E0B",red:"#EF4444",blue:"#3B82F6",violet:"#8B5CF6",pink:"#EC4899",cyan:"#06B6D4",orange:"#F97316",t1:"#F1F5F9",t2:"#8B9BB4",t3:"#4A5568",input:"#0A1525" };
const LIGHT = { bg:"#F8FAFC",sb:"#FFFFFF",card:"#FFFFFF",border:"#E2E8F0",accent:"#059669",gold:"#D97706",red:"#DC2626",blue:"#2563EB",violet:"#7C3AED",pink:"#DB2777",cyan:"#0891B2",orange:"#EA580C",t1:"#0F172A",t2:"#475569",t3:"#94A3B8",input:"#F1F5F9" };

// ─── HOOK: useLocalStorage ────────────────────────────────────────────────────
function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; } });
  const set = useCallback(v => { setVal(prev => { const next = typeof v === "function" ? v(prev) : v; try { localStorage.setItem(key, JSON.stringify(next)); } catch {} return next; }); }, [key]);
  return [val, set];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MODELS = [
  { id:"claude-sonnet-4-20250514", label:"Claude Sonnet 4" },
  { id:"gpt-4o",                   label:"GPT-4o" },
  { id:"gpt-4o-mini",              label:"GPT-4o Mini" },
];

const AGENTS_DEF = [
  { id:"TaxAgent",        icon:"📄", color:"#10B981", short:{fr:"Fiscal",     en:"Tax"},
    domain:{fr:"Fiscalité · T1/T2 · TPS/TVQ · CRA · Revenu Québec", en:"Taxation · T1/T2 · GST/HST/QST · CRA"},
    quickPrompts:{fr:["Date limite T2 pour Dec 31?","Calcul TPS/TVQ sur vente de services","Déduction amortissement Classe 10"], en:["T2 deadline for Dec 31?","GST/HST on services","Class 10 depreciation"]},
    defaultPrompt:{fr:"Tu es TaxAgent, expert fiscal canadien pour PME québécoises. Tu croises les documents client avec ta base de connaissance métier (guides CRA, règlements TVQ). Cite toujours les numéros de formulaires CRA, signale les délais, distingue règles fédérales et québécoises. Réponds dans la langue de l'utilisateur.", en:"You are TaxAgent, a Canadian tax expert for Quebec SMEs. Cross-reference client documents with your knowledge base (CRA guides, QST regulations). Always cite CRA form numbers, flag deadlines, distinguish federal vs Quebec rules."} },
  { id:"AuditAgent",      icon:"✅", color:"#3B82F6", short:{fr:"Audit",       en:"Audit"},
    domain:{fr:"Audit · IFRS · ASPE · CPA Canada", en:"Audit · IFRS · ASPE · CPA Canada"},
    quickPrompts:{fr:["Seuil de matérialité pour CA de 2M$","Checklist contrôles internes","Exigences IFRS 16 contrats"], en:["Materiality threshold for $2M","Internal controls checklist","IFRS 16 lease requirements"]},
    defaultPrompt:{fr:"Tu es AuditAgent, auditeur senior expert PCGR, ASPE et IFRS. Tu analyses les documents client en référençant les normes de ta base métier. Identifie les zones de risque, seuils de matérialité et lacunes de contrôles.", en:"You are AuditAgent, a senior auditor expert in GAAP, ASPE and IFRS. Analyze client documents referencing your knowledge base. Identify risk areas, materiality thresholds and control gaps."} },
  { id:"CashFlowAgent",   icon:"💧", color:"#8B5CF6", short:{fr:"Trésorerie",  en:"Cash"},
    domain:{fr:"Trésorerie · Liquidité · Prévisions 13 sem./12 mois", en:"Treasury · Liquidity · 13-week/12-month forecasts"},
    quickPrompts:{fr:["Prévision trésorerie 13 semaines","Seuil de liquidité recommandé","Optimisation du BFR"], en:["13-week cash flow forecast","Recommended liquidity threshold","Working capital optimization"]},
    defaultPrompt:{fr:"Tu es CashFlowAgent, analyste trésorerie pour PME canadiennes. Fournis horizons 13 semaines et 12 mois, signale les risques de liquidité avec seuils précis, suggère des actions d'optimisation concrètes.", en:"You are CashFlowAgent, a treasury analyst for Canadian SMEs. Provide 13-week and 12-month horizons, flag liquidity risks with precise thresholds."} },
  { id:"ComplianceAgent", icon:"⚖️", color:"#F59E0B", short:{fr:"Conformité",  en:"Compliance"},
    domain:{fr:"Conformité · Loi 25 · CASL · PIPEDA · IFRS réglementaire", en:"Compliance · Law 25 · CASL · PIPEDA · IFRS regulatory"},
    quickPrompts:{fr:["Obligations Loi 25 pour PME 2025","Formulaire consentement CASL","EFVP — quand est-elle obligatoire?"], en:["Law 25 obligations SME 2025","CASL-compliant consent form","DPIA — when is it mandatory?"]},
    defaultPrompt:{fr:"Tu es ComplianceAgent, spécialiste conformité canadienne et québécoise. Tu croises les documents client avec ta base métier (Loi 25, CASL, PIPEDA). Distingue fédéral vs provincial. Signale délais et pénalités.", en:"You are ComplianceAgent, a Canadian and Quebec compliance specialist. Cross-reference client documents with your knowledge base (Law 25, CASL, PIPEDA). Distinguish federal vs provincial."} },
  { id:"FinancialAgent",  icon:"📊", color:"#06B6D4", short:{fr:"Analyse",     en:"Analysis"},
    domain:{fr:"Analyse financière · Ratios · Benchmarks sectoriels PME Québec", en:"Financial analysis · Ratios · Quebec SME benchmarks"},
    quickPrompts:{fr:["Analyse ratios financiers Q4","Benchmark BAIIA secteur manufacturier","Évaluation entreprise DCF"], en:["Q4 financial ratio analysis","Manufacturing EBITDA benchmark","DCF business valuation"]},
    defaultPrompt:{fr:"Tu es FinancialAgent, analyste financier senior pour PME canadiennes. Analyse les documents client en les comparant aux benchmarks sectoriels (Statistique Canada). Utilise les ratios standards, contextualise pour le marché québécois.", en:"You are FinancialAgent, a senior financial analyst for Canadian SMEs. Analyze client documents against sector benchmarks (Statistics Canada)."} },
  { id:"InvestmentAgent", icon:"📈", color:"#EC4899", short:{fr:"Invest.",     en:"Invest."},
    domain:{fr:"Investissement · DCF/TRI/VAN · Portefeuilles · ROI · OSC/AMF", en:"Investment · DCF/IRR/NPV · Portfolios · ROI · OSC/AMF"},
    quickPrompts:{fr:["Analyse DCF acquisition immobilière","TRI minimum acceptable PME","Évaluation risque portefeuille"], en:["Real estate acquisition DCF","Minimum acceptable IRR for SME","Portfolio risk assessment"]},
    defaultPrompt:{fr:"Tu es InvestmentAgent, analyste investissement senior PME canadiennes. Applique DCF, TRI, VAN. Considère les implications fiscales canadiennes. Fournis recommandation go/no-go. Référence OSC/AMF Québec si pertinent.", en:"You are InvestmentAgent, a senior investment analyst. Apply DCF, IRR, NPV. Consider Canadian tax implications. Provide go/no-go recommendation."} },
  { id:"OCRAgent",        icon:"🔍", color:"#F97316", short:{fr:"OCR",         en:"OCR"},
    domain:{fr:"Extraction OCR · Factures scannées · Relevés · Documents manuscrits", en:"OCR extraction · Scanned invoices · Statements · Handwritten docs"},
    quickPrompts:{fr:["Extraire données d'une facture scannée","Lire un relevé bancaire scanné","Structurer un document manuscrit"], en:["Extract data from scanned invoice","Read scanned bank statement","Structure handwritten document"]},
    defaultPrompt:{fr:"Tu es OCRAgent, spécialiste en extraction et structuration de données depuis des documents scannés, photographiés ou manuscrits. Tu extrais les données clés (montants, dates, parties, numéros), les structures en JSON ou tableaux, et signales les zones illisibles.", en:"You are OCRAgent, a specialist in extracting and structuring data from scanned, photographed or handwritten documents."} },
  { id:"VeilleAgent",     icon:"📡", color:"#14B8A6", short:{fr:"Veille",       en:"Watch"},
    domain:{fr:"Veille métier temps réel · CRA · IFRS · Loi 25 · Finance · Comptabilité · Québec", en:"Real-time monitoring · CRA · IFRS · Law 25 · Finance · Accounting · Quebec"},
    webSearch: true,
    quickPrompts:{fr:["Dernières mises à jour CRA 2025","Nouvelles normes IFRS publiées","Actualités fiscales Québec ce mois","Changements Revenu Québec récents"], en:["Latest CRA updates 2025","New IFRS standards published","Quebec fiscal news this month","Recent Revenu Québec changes"]},
    defaultPrompt:{fr:`Tu es VeilleAgent, un agent de veille stratégique et professionnelle pour les PME québécoises en finance et comptabilité.

Tu as accès à la recherche web en temps réel. Pour chaque question, tu dois :
1. Rechercher les informations les plus récentes sur le sujet demandé
2. Prioriser les sources officielles : ARC (canada.ca), Revenu Québec, CPA Canada, IFRS Foundation, FASB, gouvernement du Canada, Assemblée nationale du Québec
3. Identifier les changements récents (nouvelles lois, nouvelles normes, nouvelles circulaires, bulletins d'interprétation)
4. Résumer les impacts pratiques pour les PME québécoises
5. Indiquer la date de publication et la source pour chaque information

Domaines couverts : fiscalité canadienne et québécoise, normes comptables (IFRS/ASPE/NCECF), réglementation financière, droit des affaires, conformité (Loi 25, CASL, PIPEDA), actualités économiques pertinentes pour les PME.

Toujours indiquer : date de l'information, source officielle, impact pratique. Signale si une information est en vigueur, en projet de loi ou en consultation publique.
Réponds dans la langue de l'utilisateur (français ou anglais).`,
    en:`You are VeilleAgent, a strategic and professional monitoring agent for Quebec SMEs in finance and accounting.

You have real-time web search access. For each question, you must:
1. Search for the most recent information on the requested topic
2. Prioritize official sources: CRA (canada.ca), Revenu Québec, CPA Canada, IFRS Foundation, Government of Canada, Quebec National Assembly
3. Identify recent changes (new laws, new standards, new circulars, interpretation bulletins)
4. Summarize practical impacts for Quebec SMEs
5. Indicate publication date and source for each piece of information

Coverage: Canadian and Quebec taxation, accounting standards (IFRS/ASPE/NCECF), financial regulation, business law, compliance (Law 25, CASL, PIPEDA), relevant economic news for SMEs.

Always indicate: information date, official source, practical impact. Flag if information is in force, in bill form, or in public consultation.
Respond in the user's language.`} },
  { id:"SubventionsAgent", icon:"💰", color:"#A855F7", short:{fr:"Subventions",  en:"Grants"},
    domain:{fr:"Subventions gouvernementales & non-gouvernementales · Fédéral · Québec · Municipal · Fondations", en:"Government & non-government grants · Federal · Quebec · Municipal · Foundations"},
    webSearch: true,
    quickPrompts:{fr:["Subventions disponibles PME tech Québec","Programmes IRAP et SR&ED 2025","Aides financières Investissement Québec","Subventions non gouvernementales innovation"], en:["Available grants Quebec tech SME","IRAP and SR&ED programs 2025","Investissement Québec financial aid","Non-government innovation grants"]},
    defaultPrompt:{fr:`Tu es SubventionsAgent, un expert en recherche et identification de subventions, aides financières et programmes de financement pour les PME québécoises et canadiennes.

Tu as accès à la recherche web en temps réel. Pour chaque demande, tu dois :
1. Rechercher activement les programmes de subventions disponibles correspondant au profil de l'entreprise
2. Couvrir les trois niveaux gouvernementaux : fédéral (Canada), provincial (Québec), municipal
3. Inclure les organismes non gouvernementaux : fondations, accélérateurs, fonds d'impact, associations sectorielles
4. Pour chaque subvention trouvée, préciser :
   - Nom officiel du programme et organisme responsable
   - Montant disponible ou pourcentage de financement
   - Critères d'admissibilité (secteur, taille, revenus, stade, région)
   - Date limite de dépôt ou caractère continu
   - Lien officiel vers le programme
   - Type : remboursable / non-remboursable / prêt / crédit d'impôt
5. Trier par pertinence et montant potentiel
6. Signaler les opportunités urgentes (dates limites proches)

Programmes phares à toujours vérifier : SR&ED (CRA), IRAP (NRC), CanExport, PME en action, Essor (Investissement Québec), PARI, programmes CLD/MRC, fonds sectoriels (numérique, vert, manufacturier, agroalimentaire).

Réponds dans la langue de l'utilisateur (français ou anglais).`,
    en:`You are SubventionsAgent, an expert in researching and identifying grants, financial aid, and funding programs for Quebec and Canadian SMEs.

You have real-time web search access. For each request, you must:
1. Actively search for available grant programs matching the company profile
2. Cover all three government levels: federal (Canada), provincial (Quebec), municipal
3. Include non-governmental organizations: foundations, accelerators, impact funds, sector associations
4. For each grant found, specify:
   - Official program name and responsible organization
   - Available amount or funding percentage
   - Eligibility criteria (sector, size, revenue, stage, region)
   - Submission deadline or ongoing nature
   - Official program link
   - Type: repayable / non-repayable / loan / tax credit
5. Sort by relevance and potential amount
6. Flag urgent opportunities (upcoming deadlines)

Key programs to always check: SR&ED (CRA), IRAP (NRC), CanExport, PME en action, Essor (Investissement Québec), PARI, CLD/MRC programs, sector funds (digital, green, manufacturing, agri-food).

Respond in the user's language.`} },
];

const agentById  = id => AGENTS_DEF.find(a => a.id === id) || AGENTS_DEF[0];
const agentColor = id => agentById(id).color;
const agentIcon  = id => agentById(id).icon;

// ─── VECTDOCS-INSPIRED UTILITIES ─────────────────────────────────────────────

// Inspired by VectDocs EmbeddedDocument fileType enum — extended for finance
const FILE_CATEGORY = ext => {
  if (["pdf"].includes(ext))                          return "pdf";
  if (["docx","doc"].includes(ext))                   return "docx";
  if (["xlsx","xls"].includes(ext))                   return "xlsx";
  if (["pptx","ppt"].includes(ext))                   return "pptx";
  if (["txt","md","csv","json","html","xml"].includes(ext)) return "text";
  if (["png","jpg","jpeg","gif","webp","tiff"].includes(ext)) return "image";
  if (["mp4","avi","mov","mkv"].includes(ext))         return "video";
  if (["mp3","wav","m4a"].includes(ext))               return "audio";
  if (["zip","rar","7z"].includes(ext))                return "archive";
  if (["msg","eml"].includes(ext))                     return "email";
  return "unknown";
};

const typeIcon = ext => ({pdf:"📕",docx:"📘",doc:"📘",xlsx:"📗",xls:"📗",pptx:"📙",ppt:"📙",csv:"📊",txt:"📃",md:"📃",json:"📋",html:"🌐",xml:"📋",png:"🖼️",jpg:"🖼️",jpeg:"🖼️",gif:"🖼️",webp:"🖼️",tiff:"🖼️",zip:"🗜️",rar:"🗜️",msg:"📧",eml:"📧",mp4:"🎬",mp3:"🎵",wav:"🎵"}[ext] || "📄");

// Inspired by VectDocs — client-side text extraction for instant preview
// Decision: only for lightweight text formats; DOCX/PPTX/XLSX stay server-side
// (browser can't run mammoth/JSZip without those libs, and financial data shouldn't be
//  fully client-side processed for Loi 25 traceability)
async function extractTextPreview(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const cat = FILE_CATEGORY(ext);
  // Hard limit: never extract images/video/audio client-side
  if (["image","video","audio","archive","email"].includes(cat)) return null;
  // Text files: full extraction
  if (cat === "text") {
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = e => {
        const full = e.target.result || "";
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
          const s = e.target.result || "";
          // Extract visible text between BT...ET markers and parentheses
          const parens = (s.match(/\(([^)]{3,80})\)/g) || []).map(m => m.slice(1,-1)).filter(t => /[a-zA-ZÀ-ÿ]{3}/.test(t));
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
function detectAgentFromFile(filename, previewText = "") {
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
function detectLanguage(text) {
  if (!text || text.length < 30) return "unknown";
  const fr = (text.match(/\b(les|des|dans|pour|avec|sur|est|sont|une|qui|que|mais|par|nous|vous|ils|elles|cette|votre|notre)\b/gi)||[]).length;
  const en = (text.match(/\b(the|and|for|with|that|this|are|from|have|been|will|your|their|not|can|all|been|more)\b/gi)||[]).length;
  return fr > en ? "fr" : en > fr ? "en" : "unknown";
}

// Estimate chunks before server processes (VectDocs-inspired schema enrichment)
const estimateChunks = words => Math.max(1, Math.ceil(words / 375)); // ~500 tokens ≈ 375 words

// Pipeline stage labels for upload progress
function uploadStageLabel(progress) {
  if (progress < 15) return "Lecture...";
  if (progress < 35) return "Extraction texte...";
  if (progress < 60) return "Chunking (500 tok)...";
  if (progress < 85) return "Embedding HF...";
  if (progress < 100) return "Stockage pgvector...";
  return null;
}

// ─── SHARED UTILS ─────────────────────────────────────────────────────────────
const fmtSize = b => { if(!b) return "—"; const m=b/1048576; return m>=1?m.toFixed(1)+" MB":Math.round(b/1024)+" KB"; };
const fmtTime = iso => { const d=Math.floor((Date.now()-new Date(iso))/60000); if(d<1)return"À l'instant";if(d<60)return`${d} min`;if(d<1440)return`${Math.floor(d/60)}h`;if(d<2880)return"Hier";return new Date(iso).toLocaleDateString("fr-CA",{day:"numeric",month:"short"}); };
const genTitle = msg => { const w=msg.replace(/[*#_]/g,"").trim().split(" "); return w.slice(0,7).join(" ")+(w.length>7?"...":""); };
// Aucune limite de taille — tous les fichiers acceptés sans restriction
const validateFile = () => null;

const T = {
  fr: { nav:{dashboard:"Dashboard",chat:"Chat IA",documents:"Documents",pipeline:"Pipeline RAG",governance:"Gouvernance",agents:"Agents"}, lang:"FR", langToggle:"EN",
    dash:{title:"Tableau de bord",updated:"Mis à jour",activity:"Activité récente",calendar:"Calendrier fiscal 2025"},
    docs:{title:"Gestion documentaire RAG",knowledge:"Sources de connaissance métier",client:"Documents client",upload:"Glissez vos fichiers ici",sub:"Cliquez pour parcourir · Dossier entier · Jusqu'à 500 MB/fichier · Stockage RAG illimité · Tous types",indexed:"✓ Indexé",staServerOnly:"Extraction côté serveur"},
    chat:{new:"Nouvelle conversation",send:"Envoyer",copy:"Copier",copied:"Copié !",export:"Exporter",retry:"Réessayer",routing:"Détection agent...",noConv:"Aucune conversation\nCommencez par envoyer un message",resume:"Conversation reprise",autoRouted:"Auto-routé vers"},
    agents:{title:"Annuaire des agents",startConv:"Démarrer une conversation",savePrompt:"Sauvegarder",cancel:"Annuler"},
    pipeline:{title:"Pipeline RAG — Observabilité",availability:"Disponibilité",latency:"Latence",errors:"Erreurs",sla:"SLA",lastRun:"Dernier run"},
    governance:{title:"Gouvernance & Conformité",policies:"Politiques actives",catalog:"Catalogue données",owner:"Responsable",lastReview:"Dernière revue",nextAudit:"Prochain audit",status:{compliant:"Conforme",review:"À réviser",noncompliant:"Non conforme"}},
  },
  en: { nav:{dashboard:"Dashboard",chat:"AI Chat",documents:"Documents",pipeline:"RAG Pipeline",governance:"Governance",agents:"Agents"}, lang:"EN", langToggle:"FR",
    dash:{title:"Dashboard",updated:"Updated",activity:"Recent activity",calendar:"Fiscal calendar 2025"},
    docs:{title:"RAG Document Management",knowledge:"Business knowledge sources",client:"Client documents",upload:"Drag your files here",sub:"Click to browse · Folder upload · Up to 500 MB/file · Unlimited RAG storage · All types",indexed:"✓ Indexed",staServerOnly:"Server-side extraction"},
    chat:{new:"New conversation",send:"Send",copy:"Copy",copied:"Copied!",export:"Export",retry:"Retry",routing:"Detecting agent...",noConv:"No conversations\nStart by sending a message",resume:"Conversation resumed",autoRouted:"Auto-routed to"},
    agents:{title:"Agent directory",startConv:"Start a conversation",savePrompt:"Save",cancel:"Cancel"},
    pipeline:{title:"RAG Pipeline — Observability",availability:"Availability",latency:"Latency",errors:"Errors",sla:"SLA",lastRun:"Last run"},
    governance:{title:"Governance & Compliance",policies:"Active policies",catalog:"Data catalog",owner:"Owner",lastReview:"Last review",nextAudit:"Next audit",status:{compliant:"Compliant",review:"Needs review",noncompliant:"Non-compliant"}},
  }
};

// ─── API ──────────────────────────────────────────────────────────────────────
// Standard call — RAG agents (no web search)
async function callClaude(system, messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1200, system, messages: messages.map(m=>({role:m.role,content:m.content})) })
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const d = await res.json();
  return d.content?.[0]?.text || "Erreur inattendue.";
}

// Web-search-enabled call — VeilleAgent + SubventionsAgent
// Uses Anthropic web_search tool for real-time information
async function callClaudeWithWebSearch(system, messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:2000, system,
      tools:[{ type:"web_search_20250305", name:"web_search" }],
      messages: messages.map(m=>({role:m.role,content:m.content}))
    })
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const d = await res.json();
  // Collect all text blocks (may be multiple after tool use)
  const textBlocks = (d.content||[]).filter(b=>b.type==="text").map(b=>b.text);
  return textBlocks.join("\n\n") || "Erreur inattendue.";
}

// Route to correct API based on agent type
const WEB_SEARCH_AGENTS = new Set(["VeilleAgent","SubventionsAgent"]);
async function callAgent(agentId, system, messages) {
  return WEB_SEARCH_AGENTS.has(agentId)
    ? callClaudeWithWebSearch(system, messages)
    : callClaude(system, messages);
}

function fastRoute(msg) {
  const m = msg.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  if (/t1|t2|tps|tvq|gst|hst|fiscal|impot|cra|revenu.quebec|deduction|amortissement/.test(m)) return "TaxAgent";
  if (/audit|ifrs|aspe|verification|controle.interne|cpa|materialite/.test(m)) return "AuditAgent";
  if (/tresorerie|cash.flow|liquidite|flux.de|budget|prevision.de.caisse|bfr/.test(m)) return "CashFlowAgent";
  if (/loi.25|casl|pipeda|conformite|donnees.personnelles|consentement|efvp/.test(m)) return "ComplianceAgent";
  if (/ratio|analyse.financiere|benchmark|baiia|ebitda|marge|solvabilite/.test(m)) return "FinancialAgent";
  if (/investissement|roi|tir|van|dcf|portefeuille|acquisition/.test(m)) return "InvestmentAgent";
  if (/scan|ocr|photo|facture.scan|releve.scan|manuscrit/.test(m)) return "OCRAgent";
  if (/veille|actualite|mise.a.jour|nouveaute|changement.recent|derniere.loi|nouvelle.norme|bulletin|circulaire|nouvelles.fiscales/.test(m)) return "VeilleAgent";
  if (/subvention|aide.financiere|programme.financement|grant|bourse|sred|irap|pari|investissement.quebec|cld|mrc|financement.gouvern|non.gouvern|fondation|accelerateur/.test(m)) return "SubventionsAgent";
  return null;
}

async function routeViaAPI(msg) {
  try {
    const r = await callClaude("You are a routing agent. Given a user message, return ONLY the agent name — one of: TaxAgent, AuditAgent, CashFlowAgent, ComplianceAgent, FinancialAgent, InvestmentAgent, OCRAgent. Return nothing else.", [{role:"user",content:msg}]);
    const name = r.trim().replace(/[^a-zA-Z]/g,"");
    return AGENTS_DEF.find(a=>a.id===name)?.id || "FinancialAgent";
  } catch { return "FinancialAgent"; }
}

const card = (P, extra={}) => ({ background:P.card, border:`1px solid ${P.border}`, borderRadius:12, ...extra });

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const KNOWLEDGE_DOCS_INIT = [
  {id:"k1",name:"Guide CRA T2 — Corporations 2024",   agent:"TaxAgent",        size:"5.1 MB",date:"2024-11-01",chunks:132,type:"pdf", words:49500,language:"fr",preview:"Les sociétés canadiennes doivent produire une déclaration T2 dans les six mois suivant la fin de leur exercice. Le présent guide explique les principales déductions admissibles...",desc:"Guide officiel ARC déclarations sociétés"},
  {id:"k2",name:"IFRS Normes complètes — édition 2024",agent:"AuditAgent",     size:"12.4 MB",date:"2024-10-15",chunks:310,type:"pdf", words:116250,language:"en",preview:"These standards require entities to present financial statements that fairly represent the financial position and performance of the entity...",desc:"Normes IFRS Foundation — édition annuelle"},
  {id:"k3",name:"Règlements TVQ — Revenu Québec 2024", agent:"TaxAgent",       size:"3.2 MB",date:"2024-09-20",chunks:87, type:"pdf", words:32625,language:"fr",preview:"La taxe de vente du Québec (TVQ) est calculée au taux de 9,975 % sur la valeur de la contrepartie payée pour une fourniture taxable...",desc:"Texte réglementaire TVQ complet"},
  {id:"k4",name:"Checklist audit interne CPA Canada",  agent:"AuditAgent",     size:"890 KB",date:"2024-08-05",chunks:44, type:"docx",words:16500,language:"fr",preview:"Vérification des contrôles internes — évaluation des risques et des procédures de contrôle conformément aux normes CPA Canada...",desc:"Grille de vérification normes CPA"},
  {id:"k5",name:"Loi 25 — Texte intégral annoté",      agent:"ComplianceAgent",size:"2.1 MB",date:"2024-07-12",chunks:96, type:"pdf", words:36000,language:"fr",preview:"Toute organisation qui collecte des renseignements personnels doit obtenir le consentement éclairé de la personne concernée. L'article 12 précise...",desc:"Loi modernisation protection renseignements"},
  {id:"k6",name:"Méthodologies DCF/TRI/VAN — PME CA",  agent:"InvestmentAgent",size:"1.4 MB",date:"2024-06-30",chunks:63, type:"pdf", words:23625,language:"fr",preview:"L'actualisation des flux de trésorerie (DCF) consiste à estimer la valeur actuelle des flux futurs générés par un investissement en les escomptant...",desc:"Cadres d'évaluation investissements PME"},
  {id:"k7",name:"Benchmarks financiers PME Québec 2024",agent:"FinancialAgent",size:"2.8 MB",date:"2024-05-18",chunks:78, type:"xlsx",words:0,language:"fr",preview:"",desc:"Statistique Canada — ratios sectoriels"},
  {id:"k8",name:"CASL — Guide conformité entreprises", agent:"ComplianceAgent",size:"760 KB",date:"2024-04-10",chunks:31, type:"pdf", words:11625,language:"en",preview:"Canada's Anti-Spam Legislation (CASL) requires businesses to obtain express or implied consent before sending commercial electronic messages...",desc:"CRTC — guide pratique CASL pour PME"},
];

const CLIENT_DOCS_INIT = [
  {id:"c1",name:"États financiers 2024 — Q4 [ABC inc.]",agent:"FinancialAgent", size:"2.4 MB",date:"2025-01-15",chunks:47,type:"pdf", words:17625,language:"fr",preview:"Bilan consolidé au 31 décembre 2024. Total actif : 4 287 300 $. Total passif : 1 953 100 $. Capitaux propres : 2 334 200 $...",desc:"Bilan, compte de résultat, flux trésorerie"},
  {id:"c2",name:"Budget trésorerie 2025 — Prévisions",  agent:"CashFlowAgent",  size:"890 KB",date:"2025-01-08",chunks:28,type:"xlsx",words:0,language:"fr",preview:"",desc:"Projections mensuelles 12 mois"},
  {id:"c3",name:"Rapport audit interne FY2024",         agent:"AuditAgent",     size:"3.2 MB",date:"2024-12-20",chunks:86,type:"pdf", words:32250,language:"fr",preview:"Synthèse des travaux d'audit interne pour l'exercice clos le 31 décembre 2024. Trois zones à risque élevé ont été identifiées...",desc:"Audit interne exercice complet"},
  {id:"c4",name:"Dossier investissement — Laval",       agent:"InvestmentAgent",size:"1.8 MB",date:"2024-12-15",chunks:53,type:"pdf", words:19875,language:"fr",preview:"Analyse de l'opportunité d'acquisition d'un immeuble commercial à Laval. Valeur d'acquisition : 3 200 000 $. TRI calculé : 18,4 %...",desc:"Acquisition bâtiment commercial"},
  {id:"c5",name:"T2 2023 — Corp. Bélanger inc.",        agent:"TaxAgent",       size:"1.1 MB",date:"2024-11-30",chunks:34,type:"pdf", words:12750,language:"fr",preview:"Déclaration de revenus des sociétés T2 pour l'année d'imposition 2023. Revenu imposable : 412 500 $. Impôt fédéral net : 61 875 $...",desc:"Déclaration corporative exercice 2023"},
  {id:"c6",name:"Revue conformité Loi 25 — 2024",       agent:"ComplianceAgent",size:"560 KB",date:"2024-11-10",chunks:22,type:"docx",words:8250,language:"fr",preview:"Évaluation de la conformité aux exigences de la Loi 25 pour la période 2024. Deux lacunes ont été identifiées nécessitant une action corrective...",desc:"Évaluation des pratiques de données internes"},
];

const PIPELINE_DATA = [
  {id:"bronze",label:"Ingestion (Bronze)",icon:"📥",desc:"Upload, validation SHA-256, stockage S3 ca-central-1",metrics:{availability:"99.8%",latency:"1.2s",errors:"0.02%",sla:"✓"},status:"active",lastRun:"Il y a 4 min"},
  {id:"silver",label:"Traitement (Silver)",icon:"⚙️",desc:"Extraction texte (PyPDF2/python-docx), nettoyage, chunking 500 tokens",metrics:{availability:"99.5%",latency:"3.8s",errors:"0.1%",sla:"✓"},status:"active",lastRun:"Il y a 5 min"},
  {id:"gold",  label:"Embedding (Gold)",  icon:"✨",desc:"HF multilingual-e5-large → pgvector 1024 dims",metrics:{availability:"99.9%",latency:"2.1s",errors:"0.0%",sla:"✓"},status:"active",lastRun:"Il y a 5 min"},
  {id:"ready", label:"Prêt à l'emploi",   icon:"🚀",desc:"search_chunks() · cosine similarity · seuil 0.6 · EVV 9/10",metrics:{availability:"100%",latency:"0.4s",errors:"0.0%",sla:"✓"},status:"completed",lastRun:"En continu"},
];

const GOV_POLICIES = [
  {id:"loi25",  name:"Loi 25 (Québec)",  owner:"DPO — Marie Tremblay",lastReview:"2025-01-10",nextAudit:"2025-09-22",status:"compliant",desc:"Protection renseignements personnels, EFVP, droit à l'effacement"},
  {id:"casl",   name:"CASL",             owner:"Compliance — Jean Roy",lastReview:"2024-12-01",nextAudit:"2025-06-01",status:"review",   desc:"Double opt-in, mécanisme désabonnement, logs consentement"},
  {id:"pipeda", name:"PIPEDA (fédéral)", owner:"DPO — Marie Tremblay",lastReview:"2025-01-15",nextAudit:"2025-07-15",status:"compliant",desc:"Collecte, utilisation et divulgation renseignements personnels"},
  {id:"ifrs",   name:"IFRS Disclosure",  owner:"CFO — Zaki Belkhiter", lastReview:"2024-11-30",nextAudit:"2025-03-31",status:"compliant",desc:"Obligations de divulgation états financiers IFRS"},
  {id:"cra",    name:"Conformité ARC",   owner:"Tax — Sophie Mercier", lastReview:"2025-01-20",nextAudit:"2025-04-30",status:"review",   desc:"T2, T4, TPS/TVQ — échéances et remises"},
];

const DATA_QUALITY = [
  {label:{fr:"Précision sources métier",en:"Knowledge source accuracy"},value:"98.4%",trend:"+0.3%",status:"improving"},
  {label:{fr:"Fraîcheur documents",     en:"Document freshness"},       value:"94.1%",trend:"-0.5%",status:"stable"},
  {label:{fr:"Couverture domaines",     en:"Domain coverage"},          value:"87.0%",trend:"+2.1%",status:"improving"},
  {label:{fr:"Taux d'indexation",       en:"Indexing rate"},            value:"99.2%",trend:"→",    status:"stable"},
];

// ─── ENHANCED UPLOAD ZONE (VectDocs-inspired) ──────────────────────────────
function UploadZone({ color, lang, t, onAdd }) {
  const inputRef = useRef();
  const [drag, setDrag]   = useState(false);
  const [queue, setQueue] = useState([]);
  const EXT_PILLS = ["PDF","Word","Excel","PowerPoint","CSV","TXT","JSON","Images","ZIP","Email","Audio","Vidéo","et plus"];

  const processFiles = useCallback(async files => {
    const arr = Array.from(files);
    const items = arr.map(f => ({
      id: Date.now() + Math.random(),
      name: f.name,
      rawFile: f,
      size: fmtSize(f.size),
      ext: f.name.split(".").pop().toLowerCase(),
      progress: 0,
      stage: "Lecture...",
      error: validateFile(f),
      preview: null,
      detectedAgent: detectAgentFromFile(f.name),
      words: 0,
      estChunks: 0,
      language: "unknown",
      overrideAgent: null,
    }));
    setQueue(prev => [...items, ...prev].slice(0, 15));

    // VectDocs-inspired: extract text preview instantly BEFORE server indexing
    for (const item of items) {
      if (item.error) continue;
      // Async extraction in parallel
      extractTextPreview(item.rawFile).then(result => {
        const detected = detectAgentFromFile(item.name, result?.text || "");
        const lang_d   = detectLanguage(result?.text || "");
        const words_d  = result?.words || 0;
        setQueue(prev => prev.map(q => q.id === item.id ? {
          ...q,
          preview: result?.text || "",
          words: words_d,
          estChunks: estimateChunks(words_d),
          language: lang_d,
          detectedAgent: detected,
          source: result?.source,
        } : q));
      });

      // Simulate server pipeline stages
      let p = 0;
      const iv = setInterval(() => {
        p += Math.random() * 14 + 5;
        if (p >= 100) { p = 100; clearInterval(iv); }
        const stage = uploadStageLabel(p);
        setQueue(prev => prev.map(q => q.id === item.id ? {...q, progress:Math.round(p), stage} : q));
        if (p === 100 && onAdd) {
          const agent = item.overrideAgent || detectAgentFromFile(item.name);
          onAdd({ id:"u_"+Date.now()+Math.random(), name:item.name, agent, size:item.size,
            date:new Date().toISOString().slice(0,10), chunks:estimateChunks(item.words||30),
            type:item.ext, words:item.words||0, language:item.language||"fr",
            preview:item.preview||"", desc:"Document uploadé" });
        }
      }, 220);
    }
  }, [onAdd]);

  // VectDocs-inspired folder picker (showDirectoryPicker API)
  const pickFolder = useCallback(async () => {
    if (!window.showDirectoryPicker) {
      alert("Folder picker requires Chrome/Edge. Use the file button instead.");
      return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker();
      const files = [];
      for await (const [, handle] of dirHandle.entries()) {
        if (handle.kind === "file") files.push(await handle.getFile());
      }
      if (files.length > 0) processFiles(files);
    } catch(e) { if (e.name !== "AbortError") console.error(e); }
  }, [processFiles]);

  const langFlag = l => l === "fr" ? "🇫🇷" : l === "en" ? "🇬🇧" : "";

  return (
    <div style={{marginTop:14}}>
      {/* Drop zone */}
      <div onDrop={e=>{e.preventDefault();setDrag(false);processFiles(e.dataTransfer.files);}}
        onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
        onClick={()=>inputRef.current?.click()}
        style={{background:drag?`${color}12`:"var(--bg-card)",border:`2px dashed ${drag?color:"var(--bg-border)"}`,borderRadius:14,padding:"22px 20px",textAlign:"center",cursor:"pointer",transition:"all .2s"}}>
        <div style={{fontSize:28,marginBottom:8}}>{drag?"📂":"📤"}</div>
        <div style={{fontSize:14,fontWeight:500,color:drag?color:"var(--t2)",marginBottom:5}}>{t.docs.upload}</div>
        <div style={{fontSize:12,color:"var(--t3)",marginBottom:12}}>{t.docs.sub}</div>        <div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center",marginBottom:12}}>
          {EXT_PILLS.map(e=><span key={e} style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:`${color}15`,color,border:`1px solid ${color}35`,fontWeight:500}}>{e}</span>)}
        </div>
        <input ref={inputRef} type="file" multiple accept="*/*" style={{display:"none"}} onChange={e=>processFiles(e.target.files)}/>
      </div>

      {/* Folder picker button */}
      <button onClick={pickFolder} style={{width:"100%",marginTop:8,background:"transparent",border:`1px solid var(--bg-border)`,borderRadius:10,padding:"8px 0",color:"var(--t2)",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        📁 {lang==="fr"?"Uploader un dossier entier (Chrome/Edge)":"Upload entire folder (Chrome/Edge)"}
      </button>

      {/* Queue with VectDocs-inspired preview */}
      {queue.length > 0 && (
        <div style={{background:"var(--bg-card)",border:"1px solid var(--bg-border)",borderRadius:12,overflow:"hidden",marginTop:10}}>
          <div style={{padding:"9px 14px",borderBottom:"1px solid var(--bg-border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:500,color:"var(--t2)"}}>
              {lang==="fr"?"File d'indexation":"Indexing queue"} ({queue.length})
            </span>
            <button onClick={()=>setQueue([])} style={{background:"transparent",border:"none",color:"var(--t3)",fontSize:11,cursor:"pointer"}}>✕ {lang==="fr"?"Effacer":"Clear"}</button>
          </div>

          {queue.map(f => (
            <div key={f.id} style={{padding:"11px 14px",borderBottom:"1px solid var(--bg-border)"}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{typeIcon(f.ext)}</span>
                <div style={{flex:1,minWidth:0}}>
                  {/* File name + size + language */}
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{fontSize:12,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{f.name}</span>
                    <span style={{fontSize:10,color:"var(--t3)",flexShrink:0}}>{f.size}</span>
                    {f.language !== "unknown" && <span style={{fontSize:12}}>{langFlag(f.language)}</span>}
                  </div>

                  {/* VectDocs-inspired: detected agent badge (overrideable) */}
                  {!f.error && (
                    <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,color:"var(--t3)"}}>{lang==="fr"?"Agent détecté :":"Detected agent:"}</span>
                      <select
                        value={f.overrideAgent || f.detectedAgent}
                        onChange={e => setQueue(prev=>prev.map(q=>q.id===f.id?{...q,overrideAgent:e.target.value}:q))}
                        onClick={e=>e.stopPropagation()}
                        style={{fontSize:10,background:"var(--bg-input)",border:`1px solid ${agentColor(f.overrideAgent||f.detectedAgent)}50`,borderRadius:6,padding:"2px 6px",color:agentColor(f.overrideAgent||f.detectedAgent),cursor:"pointer",fontWeight:500}}>
                        {AGENTS_DEF.map(a=><option key={a.id} value={a.id}>{a.icon} {a.id.replace("Agent","")}</option>)}
                      </select>
                      {f.words > 0 && <span style={{fontSize:10,color:"var(--t3)"}}>{f.words.toLocaleString()} mots · ~{f.estChunks} chunks</span>}
                    </div>
                  )}

                  {/* VectDocs-inspired: instant text preview */}
                  {f.preview && f.progress < 100 && (
                    <div style={{fontSize:10,color:"var(--t3)",background:"var(--bg-input)",borderRadius:6,padding:"5px 8px",marginBottom:6,lineHeight:1.4,overflow:"hidden",maxHeight:40,textOverflow:"ellipsis",fontStyle:"italic"}}>
                      "{f.preview.slice(0,120)}{f.preview.length>120?"...":""}"
                    </div>
                  )}
                  {f.source === "server-only" && f.progress < 100 && (
                    <div style={{fontSize:10,color:"var(--t3)",marginBottom:5}}>📡 {t.docs.staServerOnly}</div>
                  )}

                  {/* Progress bar with stage label */}
                  {f.error
                    ? <div style={{fontSize:11,color:"#EF4444",fontWeight:500}}>{f.error}</div>
                    : f.progress < 100
                      ? <div>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                            <span style={{fontSize:10,color:color}}>{f.stage}</span>
                            <span style={{fontSize:10,color:"var(--t3)"}}>{f.progress}%</span>
                          </div>
                          <div style={{height:3,background:"var(--bg-border)",borderRadius:2}}>
                            <div style={{height:"100%",width:`${f.progress}%`,background:color,borderRadius:2,transition:"width .3s"}}/>
                          </div>
                        </div>
                      : <div style={{fontSize:11,color:"#10B981",fontWeight:500}}>✓ {t.docs.indexed} — {f.ext.toUpperCase()} · {f.estChunks} chunks</div>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, darkMode, setDarkMode, lang, setLang, t, P }) {
  const nav = [{id:"dashboard",icon:"⬛",key:"dashboard"},{id:"chat",icon:"💬",key:"chat"},{id:"documents",icon:"📁",key:"documents"},{id:"pipeline",icon:"🔄",key:"pipeline"},{id:"governance",icon:"🛡️",key:"governance"},{id:"agents",icon:"🤖",key:"agents"}];
  return (
    <div style={{width:200,background:P.sb,borderRight:`1px solid ${P.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"18px 20px 16px"}}>
        <div style={{fontSize:14,fontWeight:700,color:P.accent,letterSpacing:"0.12em"}}>Z12</div>
        <div style={{fontSize:10,color:P.t3,marginTop:2}}>AI CFO Suite · ZAKI OS</div>
      </div>
      <div style={{flex:1}}>
        {nav.map(n=>(
          <button key={n.id} onClick={()=>setView(n.id)} style={{width:"100%",background:view===n.id?`${P.accent}18`:"transparent",border:"none",borderLeft:`2px solid ${view===n.id?P.accent:"transparent"}`,color:view===n.id?P.accent:P.t2,padding:"10px 20px",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:view===n.id?500:400,transition:"all .15s"}}>
            <span style={{fontSize:13}}>{n.icon}</span>{t.nav[n.key]}
          </button>
        ))}
      </div>
      <div style={{padding:"12px 14px",borderTop:`1px solid ${P.border}`,display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setLang(l=>l==="fr"?"en":"fr")} style={{flex:1,background:`${P.accent}15`,border:`1px solid ${P.accent}35`,borderRadius:8,padding:"6px 0",color:P.accent,fontSize:12,fontWeight:600,cursor:"pointer"}}>{t.langToggle}</button>
          <button onClick={()=>setDarkMode(d=>!d)} style={{flex:1,background:P.border,border:`1px solid ${P.border}`,borderRadius:8,padding:"6px 0",color:P.t2,fontSize:14,cursor:"pointer"}}>{darkMode?"☀️":"🌙"}</button>
        </div>
        <div style={{fontSize:9,color:P.t3,textAlign:"center"}}>v3.1 · VectDocs ✦ integrated</div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ t, P, lang }) {
  const kpis = [{label:lang==="fr"?"Revenus Q1 2025":"Revenue Q1 2025",value:"$847 320",change:"+12.4%",up:true,icon:"💹"},{label:lang==="fr"?"Obligations fiscales":"Tax obligations",value:"$124 580",change:"Éch. 30 avr.",up:false,icon:"🏛️"},{label:lang==="fr"?"Cash flow net":"Net cash flow",value:"$203 445",change:"+8.2%",up:true,icon:"💧"},{label:lang==="fr"?"Score conformité":"Compliance score",value:"94/100",change:"Excellent",up:true,icon:"🛡️"}];
  const acts = [{time:"2h",agent:"TaxAgent",text:lang==="fr"?"Analyse T2 — déduction amortissement paragraphe 13":"T2 analysis — paragraph 13 amortization deduction",color:P.accent},{time:"5h",agent:"CashFlowAgent",text:lang==="fr"?"Prévision 13 sem. — risque liquidité semaine 8":"13-week forecast — week 8 liquidity risk",color:P.violet},{time:"1j",agent:"VeilleAgent",text:lang==="fr"?"Veille ARC — nouvelles directives crédit d'impôt RS&DE publiées":"CRA Watch — new SR&ED tax credit guidelines published",color:"#14B8A6"},{time:"1j",agent:"SubventionsAgent",text:lang==="fr"?"3 nouvelles subventions PME tech Québec identifiées — PARI + Essor + CLD":"3 new Quebec tech SME grants identified — PARI + Essor + CLD",color:"#A855F7"},{time:"2j",agent:"AuditAgent",text:lang==="fr"?"Contrôles internes Q4 — 3 points d'attention":"Q4 internal controls — 3 attention points",color:P.blue},{time:"3j",agent:"InvestmentAgent",text:lang==="fr"?"DCF Laval — TRI 18.4% · GO":"Laval DCF — IRR 18.4% · GO",color:P.pink}];
  const cal = [{d:"28 fév.",l:lang==="fr"?"T4 — Feuillets employés":"T4 — Employee slips",u:false},{d:"30 avr.",l:lang==="fr"?"T1 particuliers":"T1 personal returns",u:true},{d:"15 juin",l:lang==="fr"?"Acompte provisionnel Q2":"Q2 instalment",u:false},{d:"30 juin",l:lang==="fr"?"T2 — 6 mois après fin exercice":"T2 — 6 months after year-end",u:false}];
  return (
    <div style={{padding:26,overflowY:"auto",flex:1}}>
      <h1 style={{fontSize:20,fontWeight:600,color:P.t1,fontFamily:"'Playfair Display',Georgia,serif",marginBottom:4}}>{t.dash.title}</h1>
      <p style={{fontSize:13,color:P.t2,marginBottom:18}}>{t.dash.updated} aujourd'hui 09:32 · PME Québec · Exercice 2025</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:18}}>
        {kpis.map((k,i)=>(<div key={i} style={{...card(P),padding:"14px 16px"}}><div style={{fontSize:20,marginBottom:8}}>{k.icon}</div><div style={{fontSize:22,fontWeight:600,color:P.t1,fontFamily:"'DM Mono',monospace"}}>{k.value}</div><div style={{fontSize:12,color:P.t2,marginTop:3}}>{k.label}</div><div style={{fontSize:11,color:k.up?P.accent:P.gold,marginTop:5,fontWeight:500}}>{k.change}</div></div>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{...card(P),padding:"16px 18px"}}>
          <div style={{fontSize:13,fontWeight:500,color:P.t1,marginBottom:14}}>{t.dash.activity}</div>
          {acts.map((a,i)=>(<div key={i} style={{display:"flex",gap:8,paddingBottom:10,marginBottom:10,borderBottom:i<acts.length-1?`1px solid ${P.border}`:"none"}}><div style={{width:6,height:6,borderRadius:"50%",background:a.color,marginTop:4,flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:12,color:P.t1,lineHeight:1.4}}>{a.text}</div><div style={{fontSize:10,color:P.t3,marginTop:2}}>{a.agent} · Il y a {a.time}</div></div></div>))}
        </div>
        <div style={{...card(P),padding:"16px 18px"}}>
          <div style={{fontSize:13,fontWeight:500,color:P.t1,marginBottom:14}}>{t.dash.calendar}</div>
          {cal.map((d,i)=>(<div key={i} style={{background:d.u?`${P.red}12`:`${P.border}50`,borderRadius:8,padding:"9px 12px",marginBottom:8,border:`1px solid ${d.u?P.red+"40":P.border}`}}><div style={{fontSize:12,fontWeight:600,color:d.u?P.red:P.gold,fontFamily:"'DM Mono',monospace"}}>{d.d}</div><div style={{fontSize:12,color:P.t2,marginTop:2}}>{d.l}</div></div>))}
        </div>
      </div>
    </div>
  );
}

// ─── DOCUMENTS (VectDocs-enhanced) ───────────────────────────────────────────
function Documents({ t, P, lang }) {
  const [tab, setTab]       = useState("knowledge");
  const [kDocs, setKDocs]   = useLocalStorage("z12-kdocs", KNOWLEDGE_DOCS_INIT);
  const [cDocs, setCDocs]   = useLocalStorage("z12-cdocs", CLIENT_DOCS_INIT);
  const [search, setSearch] = useState("");
  const [sort, setSort]     = useState("date-desc"); // date-desc | date-asc | name | size | chunks
  const [expanded, setExpanded] = useState(null);   // expanded doc id for preview

  const addK = useCallback(d => setKDocs(prev=>[d,...prev]), [setKDocs]);
  const addC = useCallback(d => setCDocs(prev=>[d,...prev]), [setCDocs]);
  const delK = useCallback(id => setKDocs(prev=>prev.filter(d=>d.id!==id)), [setKDocs]);
  const delC = useCallback(id => setCDocs(prev=>prev.filter(d=>d.id!==id)), [setCDocs]);

  const filterAndSort = useCallback((docs) => {
    let out = docs;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(d => d.name.toLowerCase().includes(q) || d.desc?.toLowerCase().includes(q) || d.agent?.toLowerCase().includes(q) || d.preview?.toLowerCase().includes(q));
    }
    return [...out].sort((a,b) => {
      if (sort==="date-desc") return new Date(b.date)-new Date(a.date);
      if (sort==="date-asc")  return new Date(a.date)-new Date(b.date);
      if (sort==="name")      return a.name.localeCompare(b.name);
      if (sort==="size")      return parseFloat(b.size)-parseFloat(a.size);
      if (sort==="chunks")    return b.chunks-a.chunks;
      return 0;
    });
  }, [search, sort]);

  const filteredK = useMemo(() => filterAndSort(kDocs), [kDocs, filterAndSort]);
  const filteredC = useMemo(() => filterAndSort(cDocs), [cDocs, filterAndSort]);
  const totalKChunks = useMemo(() => kDocs.reduce((s,d)=>s+d.chunks,0), [kDocs]);
  const totalCChunks = useMemo(() => cDocs.reduce((s,d)=>s+d.chunks,0), [cDocs]);

  const langFlag = l => l==="fr"?"🇫🇷":l==="en"?"🇬🇧":"";

  const DocRow = useCallback(({ doc, onDel }) => {
    const isExp = expanded === doc.id;
    const ac = agentColor(doc.agent);
    return (
      <div>
        <div onClick={()=>setExpanded(isExp?null:doc.id)}
          style={{display:"grid",gridTemplateColumns:"28px 1fr 115px 72px 58px 65px 32px",alignItems:"center",padding:"11px 14px",borderBottom:`1px solid ${P.border}`,gap:7,cursor:"pointer",background:isExp?`${ac}08`:"transparent",transition:"background .15s"}}>
          <span style={{fontSize:15}}>{typeIcon(doc.type)}</span>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:13,color:P.t1,fontWeight:isExp?500:400}}>{doc.name}</span>
              {doc.language && doc.language!=="unknown" && <span style={{fontSize:12}}>{langFlag(doc.language)}</span>}
            </div>
            <div style={{fontSize:10,color:P.t3,marginTop:2}}>{doc.desc} · {doc.date}</div>
          </div>
          <span style={{fontSize:11,color:ac,fontWeight:500}}>{doc.agent?.replace("Agent","")}</span>
          <span style={{fontSize:11,color:P.t2,fontFamily:"'DM Mono',monospace"}}>{doc.size}</span>
          <span style={{fontSize:11,color:P.t2,fontFamily:"'DM Mono',monospace"}}>{doc.chunks}</span>
          <span style={{fontSize:10,padding:"3px 7px",borderRadius:20,background:`${P.accent}18`,color:P.accent,fontWeight:500,whiteSpace:"nowrap"}}>✓ {lang==="fr"?"indexé":"indexed"}</span>
          <button onClick={e=>{e.stopPropagation();if(window.confirm(lang==="fr"?`Supprimer "${doc.name}" ?`:`Delete "${doc.name}"?`))onDel(doc.id);}}
            style={{background:"transparent",border:"none",color:P.t3,fontSize:13,cursor:"pointer",padding:0,lineHeight:1}}>🗑</button>
        </div>

        {/* VectDocs-inspired: expandable preview panel */}
        {isExp && (
          <div style={{padding:"12px 16px 14px 55px",background:`${ac}06`,borderBottom:`1px solid ${P.border}`}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:12}}>
              {[
                {l:lang==="fr"?"Agent":"Agent",v:`${agentIcon(doc.agent)} ${doc.agent?.replace("Agent","")}`,c:ac},
                {l:lang==="fr"?"Mots":"Words",v:doc.words?.toLocaleString()||"—",c:P.t1},
                {l:"Chunks",v:doc.chunks,c:P.t1},
                {l:lang==="fr"?"Langue":"Language",v:doc.language==="fr"?"Français":doc.language==="en"?"English":"—",c:P.t1},
                {l:lang==="fr"?"Type":"Type",v:doc.type?.toUpperCase()||"—",c:P.t1},
                {l:"Date",v:doc.date,c:P.t1},
              ].map(s=>(
                <div key={s.l} style={{background:P.card,borderRadius:8,padding:"8px 10px",border:`1px solid ${P.border}`}}>
                  <div style={{fontSize:10,color:P.t3,marginBottom:2}}>{s.l}</div>
                  <div style={{fontSize:12,fontWeight:500,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
            {doc.preview && (
              <div>
                <div style={{fontSize:10,fontWeight:500,color:P.t3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>{lang==="fr"?"Aperçu contenu":"Content preview"}</div>
                <div style={{fontSize:12,color:P.t2,background:P.input,borderRadius:8,padding:"10px 12px",lineHeight:1.6,fontStyle:"italic",border:`1px solid ${P.border}`}}>
                  "{doc.preview.slice(0,300)}{doc.preview.length>300?"...":""}"
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [expanded, P, lang]);

  const tabs = [
    {id:"knowledge",icon:"📚",label:t.docs.knowledge,count:filteredK.length,total:kDocs.length,color:P.blue},
    {id:"client",   icon:"🏢",label:t.docs.client,   count:filteredC.length,total:cDocs.length,color:P.gold},
  ];

  return (
    <div style={{padding:26,overflowY:"auto",flex:1}}>
      <h1 style={{fontSize:20,fontWeight:600,color:P.t1,fontFamily:"'Playfair Display',Georgia,serif",marginBottom:4}}>{t.docs.title}</h1>
      <p style={{fontSize:13,color:P.t2,marginBottom:14}}>
        {kDocs.length} {lang==="fr"?"sources métier":"knowledge sources"} ({totalKChunks.toLocaleString()} chunks) · {cDocs.length} {lang==="fr"?"docs client":"client docs"} ({totalCChunks.toLocaleString()} chunks) · pgvector 1024 dims · <strong style={{color:P.t1}}>{lang==="fr"?"Jusqu'à 500 MB/fichier · Stockage RAG illimité":"Up to 500 MB/file · Unlimited RAG storage"}</strong>
      </p>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:16}}>
        {[{icon:"📚",val:kDocs.length,l:lang==="fr"?"Sources métier":"Knowledge",c:P.blue},{icon:"🏢",val:cDocs.length,l:lang==="fr"?"Docs client":"Client docs",c:P.gold},{icon:"⚡",val:(totalKChunks+totalCChunks).toLocaleString(),l:"Vecteurs pgvector",c:P.accent},{icon:"♾️",val:lang==="fr"?"Illimité":"Unlimited",l:lang==="fr"?"Stockage RAG":"RAG storage",c:P.violet}].map(s=>(
          <div key={s.l} style={{...card(P),padding:"10px 12px"}}><div style={{fontSize:16,marginBottom:4}}>{s.icon}</div><div style={{fontSize:18,fontWeight:600,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.val}</div><div style={{fontSize:11,color:P.t2,marginTop:2}}>{s.l}</div></div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${P.border}`,marginBottom:14}}>
        {tabs.map(tb=>(
          <button key={tb.id} onClick={()=>{setTab(tb.id);setSearch("");setExpanded(null);}} style={{background:"transparent",border:"none",borderBottom:`2px solid ${tab===tb.id?tb.color:"transparent"}`,color:tab===tb.id?P.t1:P.t2,padding:"9px 18px",cursor:"pointer",fontSize:13,fontWeight:tab===tb.id?500:400,display:"flex",alignItems:"center",gap:7,transition:"all .15s"}}>
            {tb.icon} {tb.label}
            <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:tab===tb.id?`${tb.color}20`:`${P.border}80`,color:tab===tb.id?tb.color:P.t3,fontWeight:500}}>{tb.total}</span>
          </button>
        ))}
      </div>

      {/* Search + Sort toolbar — VectDocs-inspired */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
        <div style={{flex:1,position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:P.t3}}>🔍</span>
          <input value={search} onChange={e=>{setSearch(e.target.value);setExpanded(null);}}
            placeholder={lang==="fr"?"Rechercher par nom, agent, contenu...":"Search by name, agent, content..."}
            style={{width:"100%",background:P.input,border:`1px solid ${P.border}`,borderRadius:9,padding:"8px 12px 8px 32px",color:P.t1,fontSize:12,outline:"none"}}/>
        </div>
        <select value={sort} onChange={e=>setSort(e.target.value)}
          style={{background:P.input,border:`1px solid ${P.border}`,borderRadius:9,padding:"8px 10px",color:P.t2,fontSize:12,cursor:"pointer",outline:"none",flexShrink:0}}>
          <option value="date-desc">{lang==="fr"?"Date ↓":"Date ↓"}</option>
          <option value="date-asc">{lang==="fr"?"Date ↑":"Date ↑"}</option>
          <option value="name">{lang==="fr"?"Nom A-Z":"Name A-Z"}</option>
          <option value="chunks">Chunks ↓</option>
          <option value="size">{lang==="fr"?"Taille ↓":"Size ↓"}</option>
        </select>
        {search && <button onClick={()=>setSearch("")} style={{background:"transparent",border:`1px solid ${P.border}`,borderRadius:8,padding:"7px 10px",color:P.t3,fontSize:11,cursor:"pointer"}}>✕</button>}
      </div>

      {/* Document list */}
      {tab === "knowledge" && (
        <>
          <div style={{background:`${P.blue}10`,border:`1px solid ${P.blue}30`,borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",gap:9,alignItems:"flex-start"}}>
            <span>💡</span>
            <div style={{fontSize:12,color:P.t2,lineHeight:1.5}}>{lang==="fr"?"Socle de connaissances permanentes des agents. Consulté via RAG pour":"Permanent agent knowledge base. Consulted via RAG to"} <strong style={{color:P.t1}}>{lang==="fr"?"appuyer et valider":"support and validate"}</strong> {lang==="fr"?"les analyses des documents client.":"client document analyses."}</div>
          </div>
          <div style={{...card(P),overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 115px 72px 58px 65px 32px",padding:"8px 14px",borderBottom:`1px solid ${P.border}`,fontSize:10,fontWeight:500,color:P.t3,textTransform:"uppercase",letterSpacing:"0.07em",gap:7}}>
              <span/><span>Document</span><span>Agent</span><span>{lang==="fr"?"Taille":"Size"}</span><span>Chunks</span><span>Statut</span><span/>
            </div>
            {filteredK.length === 0 && <div style={{padding:"20px",textAlign:"center",color:P.t3,fontSize:13}}>{lang==="fr"?"Aucun résultat":"No results"}</div>}
            {filteredK.map(d=><DocRow key={d.id} doc={d} onDel={delK}/>)}
          </div>
          <UploadZone color={P.blue} lang={lang} t={t} onAdd={addK}/>
        </>
      )}
      {tab === "client" && (
        <>
          <div style={{background:`${P.gold}10`,border:`1px solid ${P.gold}30`,borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",gap:9,alignItems:"flex-start"}}>
            <span>🏢</span>
            <div style={{fontSize:12,color:P.t2,lineHeight:1.5}}>{lang==="fr"?"Documents spécifiques à chaque client. Les agents les":"Client-specific documents. Agents"} <strong style={{color:P.t1}}>{lang==="fr"?"analysent en les croisant avec les sources métier.":"analyze them by cross-referencing knowledge sources."}</strong></div>
          </div>
          <div style={{...card(P),overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 115px 72px 58px 65px 32px",padding:"8px 14px",borderBottom:`1px solid ${P.border}`,fontSize:10,fontWeight:500,color:P.t3,textTransform:"uppercase",letterSpacing:"0.07em",gap:7}}>
              <span/><span>Document</span><span>Agent</span><span>{lang==="fr"?"Taille":"Size"}</span><span>Chunks</span><span>Statut</span><span/>
            </div>
            {filteredC.length === 0 && <div style={{padding:"20px",textAlign:"center",color:P.t3,fontSize:13}}>{lang==="fr"?"Aucun résultat":"No results"}</div>}
            {filteredC.map(d=><DocRow key={d.id} doc={d} onDel={delC}/>)}
          </div>
          <UploadZone color={P.gold} lang={lang} t={t} onAdd={addC}/>
        </>
      )}

      {/* Flow legend */}
      <div style={{...card(P),padding:"12px 16px",marginTop:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:500,color:P.t2,flexShrink:0}}>Flux RAG :</span>
        {[{icon:"📚",l:lang==="fr"?"Sources métier":"Knowledge",c:P.blue},{icon:"⚡",l:"search_chunks()",c:P.accent},{icon:"🏢",l:lang==="fr"?"Docs client":"Client docs",c:P.gold},{icon:"🤖",l:"LLM",c:P.violet}].map((s,i)=>(
          <div key={s.l} style={{display:"flex",alignItems:"center",gap:5}}>
            {i>0&&<span style={{color:P.t3,fontSize:12}}>→</span>}
            <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",background:`${s.c}10`,border:`1px solid ${s.c}30`,borderRadius:8}}>
              <span style={{fontSize:12}}>{s.icon}</span>
              <span style={{fontSize:11,color:s.c,fontWeight:500}}>{s.l}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────
function Chat({ t, P, lang, agentSettings, onStartConvWithAgent }) {
  const [convs, setConvs]       = useLocalStorage("z12-conversations", []);
  const [activeId, setActiveId] = useLocalStorage("z12-active-conv", null);
  const [agentId, setAgentId]   = useState(AGENTS_DEF[0].id);
  const [msgs, setMsgs]         = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [routing, setRouting]   = useState(false);
  const [showHist, setShowHist] = useState(true);
  const [routedTo, setRoutedTo] = useState(null);
  const [copied, setCopied]     = useState(null);
  const bottomRef = useRef();
  const inputRef  = useRef();

  const agent = useMemo(() => agentById(agentId), [agentId]);
  const activeConv = useMemo(() => convs.find(c=>c.id===activeId), [convs, activeId]);
  const sysPrompt = useMemo(() => agentSettings[agentId]?.prompt || agent.defaultPrompt[lang], [agentSettings, agentId, agent, lang]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [msgs, loading]);

  const welcome = useCallback((a) => [{role:"assistant",content:`${a.icon} **${a.id.replace("Agent","")}**\n\n${lang==="fr"?"Prêt à analyser vos documents client en les croisant avec les sources métier. Comment puis-je vous aider?":"Ready to analyze your client documents cross-referenced with knowledge sources. How can I help?"}`}], [lang]);

  const newConv = useCallback(() => { setActiveId(null); setRoutedTo(null); setInput(""); setMsgs(welcome(agent)); inputRef.current?.focus(); }, [agent, welcome, setActiveId]);
  const loadConv = useCallback(conv => { setActiveId(conv.id); setAgentId(conv.agentId||AGENTS_DEF[0].id); setMsgs(conv.messages); setRoutedTo(null); setInput(""); }, [setActiveId]);
  const switchAgent = useCallback(id => { setAgentId(id); setRoutedTo(null); if(!activeId) setMsgs(welcome(agentById(id))); }, [activeId, welcome]);
  const deleteConv = useCallback(id => { setConvs(prev=>prev.filter(c=>c.id!==id)); if(activeId===id){setActiveId(null);setMsgs(welcome(agent));} }, [activeId, agent, welcome, setConvs, setActiveId]);

  useEffect(() => { if(!activeId && msgs.length===0) setMsgs(welcome(agent)); }, []);

  const copy = useCallback(async(text,i) => { try { await navigator.clipboard.writeText(text); setCopied(i); setTimeout(()=>setCopied(null),2000); } catch {} }, []);

  const exportConv = useCallback(() => {
    const data = JSON.stringify({title:activeConv?.title||"conv",agent:agentId,messages:msgs},null,2);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data],{type:"application/json"}));
    a.download = `z12-${agentId}-${Date.now()}.json`; a.click();
  }, [activeConv, agentId, msgs]);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = {role:"user",content:input,ts:Date.now()};
    const draft = [...msgs, userMsg];
    setMsgs(draft); setInput(""); setRoutedTo(null);
    setRouting(true);
    let resolved = agentId;
    const fast = fastRoute(input);
    if (fast && fast !== agentId) { resolved=fast; setAgentId(fast); setRoutedTo(fast); }
    else if (!fast) { const via = await routeViaAPI(input); if(via!==agentId){resolved=via;setAgentId(via);setRoutedTo(via);} }
    setRouting(false);
    const rDef = agentById(resolved);
    const rPrompt = agentSettings[resolved]?.prompt || rDef.defaultPrompt[lang];
    setLoading(true);
    let reply = "";
    try { reply = await callAgent(resolved, rPrompt, draft.map(m=>({role:m.role,content:m.content}))); }
    catch(e) { reply = `❌ ${lang==="fr"?"Erreur":"Error"}: ${e.message}`; }
    const final = [...draft, {role:"assistant",content:reply,agent:resolved,ts:Date.now()}];
    setMsgs(final); setLoading(false);
    const now = new Date().toISOString();
    if (activeId) { setConvs(prev=>prev.map(c=>c.id===activeId?{...c,messages:final,updatedAt:now,agentId:resolved}:c)); }
    else { const nc={id:"cv_"+Date.now(),title:genTitle(input),agentId:resolved,messages:final,createdAt:now,updatedAt:now}; setConvs(prev=>[nc,...prev]); setActiveId(nc.id); }
  }, [input, loading, msgs, agentId, lang, agentSettings, activeId, setConvs, setActiveId]);

  const renderText = s => s.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br/>");

  return (
    <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      {showHist && (
        <div style={{width:220,background:P.sb,borderRight:`1px solid ${P.border}`,display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0}}>
          <div style={{padding:"12px 12px 8px",borderBottom:`1px solid ${P.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,fontWeight:500,color:P.t3,textTransform:"uppercase",letterSpacing:"0.07em"}}>{lang==="fr"?"Historique":"History"}</span>
            <button onClick={newConv} title={t.chat.new} style={{background:P.accent,border:"none",borderRadius:6,width:26,height:26,color:"#fff",fontSize:17,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>+</button>
          </div>
          <div style={{overflowY:"auto",flex:1,padding:"6px 8px"}}>
            {!activeId && msgs.length>0 && <div style={{padding:"9px 10px",marginBottom:4,background:`${P.accent}15`,border:`1px solid ${P.accent}40`,borderRadius:8}}><div style={{fontSize:11,color:P.accent,fontWeight:500}}>✦ {t.chat.new}</div><div style={{fontSize:10,color:P.t3,marginTop:2}}>{agent.id.replace("Agent","")} · {lang==="fr"?"Non sauvegardée":"Unsaved"}</div></div>}
            {convs.length===0&&!activeId&&<div style={{padding:"20px 10px",textAlign:"center",color:P.t3,fontSize:12,lineHeight:1.6,whiteSpace:"pre-line"}}>{t.chat.noConv}</div>}
            {convs.map(c=>{const ca=agentById(c.agentId); return(
              <div key={c.id} style={{position:"relative",marginBottom:3,borderRadius:8,background:activeId===c.id?`${ca.color}15`:"transparent",border:`1px solid ${activeId===c.id?ca.color+"50":"transparent"}`,transition:"all .15s"}}>
                <div onClick={()=>loadConv(c)} style={{padding:"9px 26px 9px 10px",cursor:"pointer"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><span style={{fontSize:12}}>{ca.icon}</span><span style={{fontSize:10,color:ca.color,fontWeight:500}}>{c.agentId?.replace("Agent","")}</span><span style={{fontSize:9,color:P.t3,marginLeft:"auto"}}>{c.messages?.length||0}</span></div>
                  <div style={{fontSize:12,color:activeId===c.id?P.t1:P.t2,fontWeight:activeId===c.id?500:400,lineHeight:1.3,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                  <div style={{fontSize:10,color:P.t3}}>{fmtTime(c.updatedAt)}</div>
                </div>
                <button onClick={e=>{e.stopPropagation();deleteConv(c.id);}} style={{position:"absolute",top:6,right:6,background:"transparent",border:"none",color:P.t3,fontSize:11,cursor:"pointer"}}>✕</button>
              </div>
            );})}
          </div>
        </div>
      )}

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"9px 14px",borderBottom:`1px solid ${P.border}`,background:P.sb,display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
          <button onClick={()=>setShowHist(v=>!v)} style={{background:"transparent",border:`1px solid ${P.border}`,borderRadius:6,padding:"4px 8px",color:P.t2,cursor:"pointer",fontSize:12,flexShrink:0}}>{showHist?"◀":"▶"}</button>
          <div style={{display:"flex",gap:5,overflowX:"auto",flex:1}}>
            {AGENTS_DEF.map(a=><button key={a.id} onClick={()=>switchAgent(a.id)} style={{background:agentId===a.id?`${a.color}20`:"transparent",border:`1px solid ${agentId===a.id?a.color+"60":P.border}`,borderRadius:8,padding:"4px 9px",cursor:"pointer",color:agentId===a.id?a.color:P.t3,fontSize:11,fontWeight:agentId===a.id?500:400,whiteSpace:"nowrap",flexShrink:0}}>{a.icon} {a.short[lang]}</button>)}
          </div>
          {activeConv && <button onClick={exportConv} style={{background:"transparent",border:`1px solid ${P.border}`,borderRadius:6,padding:"4px 8px",color:P.t2,cursor:"pointer",fontSize:11,flexShrink:0}}>⬇ {t.chat.export}</button>}
          {WEB_SEARCH_AGENTS.has(agentId) && <span style={{fontSize:10,padding:"3px 10px",borderRadius:20,background:"#14B8A615",color:"#14B8A6",border:"1px solid #14B8A640",fontWeight:600,flexShrink:0,animation:"pulse 2s ease-in-out infinite"}}>🌐 {lang==="fr"?"Web Search actif":"Web Search active"}</span>}
        </div>

        {(activeConv||routedTo) && (
          <div style={{padding:"7px 16px",background:`${agent.color}08`,borderBottom:`1px solid ${P.border}`,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",minHeight:32}}>
            {routedTo && <span style={{fontSize:12,color:agent.color,fontWeight:500}}>⚡ {t.chat.autoRouted} <strong>{routedTo.replace("Agent","")}</strong></span>}
            {activeConv && !routedTo && <span style={{fontSize:12,color:P.t2}}>🔄 {t.chat.resume} — <strong style={{color:P.t1}}>{activeConv.title}</strong> · {activeConv.messages?.length} msg</span>}
            <button onClick={newConv} style={{marginLeft:"auto",background:"transparent",border:`1px solid ${P.border}`,borderRadius:6,padding:"2px 10px",color:P.t3,fontSize:11,cursor:"pointer"}}>+ {t.chat.new}</button>
          </div>
        )}

        <div style={{flex:1,overflowY:"auto",padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
          {msgs.map((m,i)=>{const ma=agentById(m.agent||agentId);return(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-start",gap:8}}>
              {m.role==="assistant" && <div style={{width:28,height:28,borderRadius:"50%",background:`${ma.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>{ma.icon}</div>}
              <div style={{maxWidth:"80%"}}>
                <div style={{background:m.role==="user"?`${agent.color}22`:P.card,border:`1px solid ${m.role==="user"?agent.color+"50":P.border}`,borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"10px 14px",fontSize:13,lineHeight:1.65,color:P.t1}} dangerouslySetInnerHTML={{__html:renderText(m.content)}}/>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                  <span style={{fontSize:10,color:P.t3}}>{m.ts?fmtTime(new Date(m.ts).toISOString()):"—"}</span>
                  <button onClick={()=>copy(m.content,i)} style={{background:"transparent",border:"none",color:copied===i?P.accent:P.t3,fontSize:10,cursor:"pointer",padding:0}}>{copied===i?t.chat.copied:t.chat.copy}</button>
                </div>
              </div>
            </div>
          );})}
          {(routing||loading) && (
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:`${agent.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>{agent.icon}</div>
              <div style={{display:"flex",gap:5,padding:"9px 14px",background:P.card,border:`1px solid ${P.border}`,borderRadius:"16px 16px 16px 4px",alignItems:"center"}}>
                {routing ? <span style={{fontSize:12,color:P.t2}}>{t.chat.routing}</span> : [0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:agent.color,animation:"pulse 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {msgs.length<=1 && agent.quickPrompts[lang] && (
          <div style={{padding:"8px 16px",borderTop:`1px solid ${P.border}`,display:"flex",gap:6,overflowX:"auto"}}>
            {agent.quickPrompts[lang].map((q,i)=><button key={i} onClick={()=>{setInput(q);inputRef.current?.focus();}} style={{background:`${agent.color}10`,border:`1px solid ${agent.color}30`,borderRadius:20,padding:"5px 12px",color:agent.color,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontWeight:500}}>{q}</button>)}
          </div>
        )}

        <div style={{padding:"10px 14px",borderTop:`1px solid ${P.border}`,background:P.sb}}>
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder={t.chat.new+"..."} rows={2}
              style={{flex:1,background:P.input,border:`1px solid ${P.border}`,borderRadius:10,color:P.t1,fontSize:13,padding:"9px 12px",resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.5}}/>
            <button onClick={send} disabled={loading||routing||!input.trim()} style={{background:loading||routing||!input.trim()?P.border:agent.color,border:"none",borderRadius:10,padding:"10px 16px",cursor:loading||routing||!input.trim()?"not-allowed":"pointer",color:"#fff",fontSize:13,fontWeight:500,flexShrink:0,transition:"background .15s"}}>{t.chat.send}</button>
          </div>
          <div style={{fontSize:10,color:P.t3,marginTop:5}}>Enter = {t.chat.send.toLowerCase()} · Shift+Enter = saut de ligne · {activeId?lang==="fr"?"Sauvegardé automatiquement":"Auto-saved":lang==="fr"?"Sauvegardé au 1er envoi":"Saved on first send"}</div>
        </div>
      </div>
    </div>
  );
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
function Pipeline({ t, P, lang }) {
  const sc = s => s==="active"?P.accent:s==="completed"?P.blue:P.t3;
  const sl = s => s==="active"?(lang==="fr"?"Actif":"Active"):s==="completed"?(lang==="fr"?"Complété":"Completed"):(lang==="fr"?"Inactif":"Idle");
  return (
    <div style={{padding:26,overflowY:"auto",flex:1}}>
      <h1 style={{fontSize:20,fontWeight:600,color:P.t1,fontFamily:"'Playfair Display',Georgia,serif",marginBottom:4}}>{t.pipeline.title}</h1>
      <p style={{fontSize:13,color:P.t2,marginBottom:18}}>{lang==="fr"?"Suivi temps réel · Supabase pgvector · HF multilingual-e5-large · EVV 9/10":"Real-time monitoring · Supabase pgvector · HF multilingual-e5-large · EVV 9/10"}</p>
      <div style={{...card(P),padding:"14px 18px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12}}>
        {[{icon:"✅",l:lang==="fr"?"Santé globale":"Global health",v:"100%",c:P.accent},{icon:"⚡",l:lang==="fr"?"Latence totale":"Total latency",v:"7.5s",c:P.blue},{icon:"📄",l:lang==="fr"?"Docs/heure":"Docs/hour",v:"142",c:P.violet},{icon:"🎯",l:"SLA compliance",v:"99.6%",c:P.gold}].map(s=>(
          <div key={s.l}><div style={{fontSize:16,marginBottom:4}}>{s.icon}</div><div style={{fontSize:20,fontWeight:600,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div><div style={{fontSize:11,color:P.t2,marginTop:2}}>{s.l}</div></div>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        {PIPELINE_DATA.map(stage=>(
          <div key={stage.id} style={{...card(P),padding:"14px 18px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:8,background:`${sc(stage.status)}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{stage.icon}</div>
                <div><div style={{fontSize:13,fontWeight:500,color:P.t1}}>{stage.label}</div><div style={{fontSize:11,color:P.t2,marginTop:1}}>{stage.desc}</div></div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:10,padding:"3px 10px",borderRadius:20,background:`${sc(stage.status)}18`,color:sc(stage.status),fontWeight:500}}>{sl(stage.status)}</span>
                <span style={{fontSize:10,color:P.t3}}>{stage.lastRun}</span>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[{l:t.pipeline.availability,v:stage.metrics.availability},{l:t.pipeline.latency,v:stage.metrics.latency},{l:t.pipeline.errors,v:stage.metrics.errors},{l:t.pipeline.sla,v:stage.metrics.sla}].map(m=>(
                <div key={m.l} style={{background:`${P.border}50`,borderRadius:8,padding:"7px 10px"}}>
                  <div style={{fontSize:10,color:P.t3,marginBottom:2}}>{m.l}</div>
                  <div style={{fontSize:14,fontWeight:600,color:m.v==="✓"?P.accent:P.t1,fontFamily:"'DM Mono',monospace"}}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{...card(P),padding:"14px 18px"}}>
        <div style={{fontSize:13,fontWeight:500,color:P.t1,marginBottom:12}}>{lang==="fr"?"Qualité documentaire (VectDocs-inspired schema)":"Document quality (VectDocs-inspired schema)"}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
          {DATA_QUALITY.map(q=>(
            <div key={q.label[lang]} style={{background:`${P.border}50`,borderRadius:8,padding:"9px 12px"}}>
              <div style={{fontSize:11,color:P.t2,marginBottom:4}}>{q.label[lang]}</div>
              <div style={{fontSize:20,fontWeight:600,color:q.status==="improving"?P.accent:q.status==="declining"?P.red:P.t1,fontFamily:"'DM Mono',monospace"}}>{q.value}</div>
              <div style={{fontSize:11,color:q.status==="improving"?P.accent:q.status==="declining"?P.red:P.t2,marginTop:2,fontWeight:500}}>{q.trend}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── GOVERNANCE ───────────────────────────────────────────────────────────────
function Governance({ t, P, lang }) {
  const sc = s => ({compliant:P.accent,review:P.gold,noncompliant:P.red}[s]||P.t3);
  const sl = s => t.governance.status[s]||s;
  return (
    <div style={{padding:26,overflowY:"auto",flex:1}}>
      <h1 style={{fontSize:20,fontWeight:600,color:P.t1,fontFamily:"'Playfair Display',Georgia,serif",marginBottom:4}}>{t.governance.title}</h1>
      <p style={{fontSize:13,color:P.t2,marginBottom:18}}>Loi 25 · CASL · PIPEDA · IFRS Disclosure · {lang==="fr"?"Conformité ARC":"CRA Compliance"}</p>
      <div style={{...card(P),padding:"14px 18px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12}}>
        {[{icon:"✅",l:lang==="fr"?"Conformes":"Compliant",v:GOV_POLICIES.filter(p=>p.status==="compliant").length,c:P.accent},{icon:"⚠️",l:lang==="fr"?"À réviser":"Needs review",v:GOV_POLICIES.filter(p=>p.status==="review").length,c:P.gold},{icon:"🗓️",l:lang==="fr"?"Audits ce mois":"Audits this month",v:"2",c:P.blue},{icon:"🛡️",l:lang==="fr"?"Score global":"Global score",v:"88%",c:P.violet}].map(s=>(
          <div key={s.l}><div style={{fontSize:16,marginBottom:4}}>{s.icon}</div><div style={{fontSize:22,fontWeight:600,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div><div style={{fontSize:11,color:P.t2,marginTop:2}}>{s.l}</div></div>
        ))}
      </div>
      <p style={{fontSize:11,fontWeight:500,color:P.t3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>{t.governance.policies}</p>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        {GOV_POLICIES.map(p=>(
          <div key={p.id} style={{...card(P),padding:"13px 18px",borderLeft:`3px solid ${sc(p.status)}`}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <span style={{fontSize:14,fontWeight:500,color:P.t1}}>{p.name}</span>
                  <span style={{fontSize:10,padding:"2px 9px",borderRadius:20,background:`${sc(p.status)}15`,color:sc(p.status),fontWeight:500,border:`1px solid ${sc(p.status)}40`}}>{sl(p.status)}</span>
                </div>
                <div style={{fontSize:12,color:P.t2,marginBottom:8,lineHeight:1.4}}>{p.desc}</div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                  {[{l:t.governance.owner,v:p.owner},{l:t.governance.lastReview,v:p.lastReview},{l:t.governance.nextAudit,v:p.nextAudit}].map(f=>(
                    <div key={f.l}><div style={{fontSize:10,color:P.t3}}>{f.l}</div><div style={{fontSize:12,color:P.t1,fontWeight:500,marginTop:1}}>{f.v}</div></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AGENTS ───────────────────────────────────────────────────────────────────
function Agents({ t, P, lang, agentSettings, setAgentSettings, onStartConvWithAgent }) {
  const [editing, setEditing]   = useState(null);
  const [draftPrompt, setDraft] = useState("");
  const [draftModel, setModel]  = useState("");
  const startEdit = useCallback(a => { setEditing(a.id); setDraft(agentSettings[a.id]?.prompt||a.defaultPrompt[lang]); setModel(agentSettings[a.id]?.model||MODELS[0].id); }, [agentSettings, lang]);
  const saveEdit  = useCallback(() => { setAgentSettings(prev=>({...prev,[editing]:{prompt:draftPrompt,model:draftModel}})); setEditing(null); }, [editing, draftPrompt, draftModel, setAgentSettings]);
  return (
    <div style={{padding:26,overflowY:"auto",flex:1}}>
      <h1 style={{fontSize:20,fontWeight:600,color:P.t1,fontFamily:"'Playfair Display',Georgia,serif",marginBottom:4}}>{t.agents.title}</h1>
      <p style={{fontSize:13,color:P.t2,marginBottom:20}}>{lang==="fr"?"9 agents · 7 RAG + 2 Web Search temps réel · EVV 9/10 · Prompts éditables · Auto-routing":"9 agents · 7 RAG + 2 Real-time Web Search · EVV 9/10 · Editable prompts · Auto-routing"}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(285px,1fr))",gap:12}}>
        {AGENTS_DEF.map(a=>{
          const kC=KNOWLEDGE_DOCS_INIT.filter(d=>d.agent===a.id).length;
          const cC=CLIENT_DOCS_INIT.filter(d=>d.agent===a.id).length;
          return (
            <div key={a.id} style={{...card(P),padding:"16px 18px",border:`1px solid ${editing===a.id?a.color:P.border}`,transition:"border-color .2s"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:38,height:38,borderRadius:9,background:`${a.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{a.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:a.color}}>{a.id}</div>
                  <div style={{fontSize:10,color:P.t3,marginTop:1}}>EVV 9/10 · {agentSettings[a.id]?.model?.split("/").pop()||"claude-sonnet"}</div>
                </div>
              </div>
              <div style={{fontSize:12,color:P.t2,lineHeight:1.5,marginBottom:10}}>{a.domain[lang]}</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                <span style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:`${P.blue}15`,color:P.blue,border:`1px solid ${P.blue}30`}}>📚 {kC} {lang==="fr"?"src métier":"knowledge"}</span>
                <span style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:`${P.gold}15`,color:P.gold,border:`1px solid ${P.gold}30`}}>🏢 {cC} {lang==="fr"?"doc client":"client doc"}</span>
                {a.webSearch && <span style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:`${a.color}15`,color:a.color,border:`1px solid ${a.color}40`,fontWeight:600}}>🌐 Web Search temps réel</span>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>onStartConvWithAgent(a.id)} style={{flex:1,background:`${a.color}15`,border:`1px solid ${a.color}40`,borderRadius:8,padding:"7px 0",color:a.color,fontSize:12,fontWeight:500,cursor:"pointer"}}>💬 {t.agents.startConv}</button>
                <button onClick={()=>editing===a.id?setEditing(null):startEdit(a)} style={{background:"transparent",border:`1px solid ${P.border}`,borderRadius:8,padding:"7px 10px",color:P.t2,fontSize:12,cursor:"pointer"}}>⚙️</button>
              </div>
              {editing===a.id && (
                <div style={{marginTop:12,padding:"12px",background:P.input,borderRadius:8,border:`1px solid ${P.border}`}}>
                  <div style={{fontSize:10,fontWeight:500,color:P.t3,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Modèle LLM</div>
                  <select value={draftModel} onChange={e=>setModel(e.target.value)} style={{width:"100%",background:P.card,border:`1px solid ${P.border}`,borderRadius:6,padding:"6px 8px",color:P.t1,fontSize:12,marginBottom:10}}>
                    {MODELS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <div style={{fontSize:10,fontWeight:500,color:P.t3,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Prompt système</div>
                  <textarea value={draftPrompt} onChange={e=>setDraft(e.target.value)} rows={5} style={{width:"100%",background:P.card,border:`1px solid ${P.border}`,borderRadius:6,padding:"8px",color:P.t1,fontSize:11,fontFamily:"'DM Mono',monospace",lineHeight:1.5,resize:"vertical",outline:"none"}}/>
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <button onClick={saveEdit} style={{flex:1,background:a.color,border:"none",borderRadius:6,padding:"7px",color:"#fff",fontSize:12,fontWeight:500,cursor:"pointer"}}>{t.agents.savePrompt}</button>
                    <button onClick={()=>setEditing(null)} style={{background:"transparent",border:`1px solid ${P.border}`,borderRadius:6,padding:"7px 12px",color:P.t2,fontSize:12,cursor:"pointer"}}>{t.agents.cancel}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function Z12CFOSuite() {
  const [view,     setView]     = useLocalStorage("z12-view",     "dashboard");
  const [darkMode, setDarkMode] = useLocalStorage("z12-dark",     true);
  const [lang,     setLang]     = useLocalStorage("z12-lang",     "fr");
  const [agentSettings, setAgentSettings] = useLocalStorage("z12-agent-settings", {});

  const handleStartConvWithAgent = useCallback(agentId => {
    sessionStorage.setItem("z12-start-agent", agentId);
    setView("chat");
  }, [setView]);

  const P = useMemo(() => darkMode ? DARK : LIGHT, [darkMode]);
  const t = useMemo(() => T[lang],                 [lang]);

  const viewProps = { t, P, lang, agentSettings, setAgentSettings, onStartConvWithAgent:handleStartConvWithAgent };

  return (
    <div style={{display:"flex",height:"100vh",background:P.bg,fontFamily:"'DM Sans',system-ui,sans-serif",overflow:"hidden","--bg-card":P.card,"--bg-border":P.border,"--bg-input":P.input,"--t1":P.t1,"--t2":P.t2,"--t3":P.t3}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${P.border};border-radius:2px}
        textarea:focus,select:focus,input:focus{border-color:${P.accent}!important;outline:none}
        @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
      `}</style>
      <Sidebar view={view} setView={setView} darkMode={darkMode} setDarkMode={setDarkMode} lang={lang} setLang={setLang} t={t} P={P}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {view==="dashboard"  && <Dashboard  {...viewProps}/>}
        {view==="chat"       && <Chat       {...viewProps}/>}
        {view==="documents"  && <Documents  {...viewProps}/>}
        {view==="pipeline"   && <Pipeline   {...viewProps}/>}
        {view==="governance" && <Governance {...viewProps}/>}
        {view==="agents"     && <Agents     {...viewProps}/>}
      </div>
    </div>
  );
}

const DEFAULT_AGENT_MODEL = "deepseek/deepseek-r1";
import { AGENTS_DEF } from './agentsConfig';

export const agentById    = id => AGENTS_DEF.find(a => a.id === id) || AGENTS_DEF[0];
export const agentColor   = id => agentById(id).color;
export const agentIcon    = id => agentById(id).icon;
export const agentName    = (id, lang) => agentById(id).personName?.[lang] || agentById(id).id;
const agentTitle   = (id, lang) => agentById(id).personTitle?.[lang] || "";

//  VECTDOCS-INSPIRED UTILITIES 

// Inspired by VectDocs EmbeddedDocument fileType enum — extended for finance
export const FILE_CATEGORY = ext => {
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

const typeIcon = ext => ({pdf:"📄",docx:"📄",doc:"📄",xlsx:"📄",xls:"📄",pptx:"📄",ppt:"📄",csv:"📄",txt:"📄",md:"📄",json:"📄",html:"<",xml:"📄",png:"📄",jpg:"📄",jpeg:"📄",gif:"📄",webp:"📄",tiff:"📄",zip:"📄",rar:"📄",msg:"📄",eml:"📄",mp4:"<📄",mp3:"<📄",wav:"<📄"}[ext] || "📄");

// Inspired by VectDocs — client-side text extraction for instant preview
// Decision: only for lightweight text formats; DOCX/PPTX/XLSX stay server-side
// (browser can't run mammoth/JSZip without those libs, and financial data shouldn't be
//  fully client-side processed for Loi 25 traceability)
import { extractTextPreview, detectAgentFromFile, detectLanguage, estimateChunks, uploadStageLabel } from './src/utils/fileUtils';

//  SHARED UTILS 
const fmtSize = b => { if(!b) return "~"; const m=b/1048576; return m>=1?m.toFixed(1)+" MB":Math.round(b/1024)+" KB"; };
const fmtTime = (iso: string) => { const d=Math.floor((Date.now()-new Date(iso).getTime())/60000); if(d<1)return"é l'instant";if(d<60)return`${d} min`;if(d<1440)return`${Math.floor(d/60)}h`;if(d<2880)return"Hier";return new Date(iso).toLocaleDateString("fr-CA",{day:"numeric",month:"short"}); };
export const genTitle = msg => { const w=msg.replace(/[*#_]/g,"").trim().split(" "); return w.slice(0,7).join(" ")+(w.length>7?"...":""); };
// Aucune limite de taille — tous les fichiers acceptés sans restriction
const validateFile = () => null;

const T = {
  fr: { nav:{dashboard:"Dashboard",chat:"Chat IA",documents:"Documents",pipeline:"Pipeline RAG",governance:"Gouvernance",agents:"Agents",settings:"Paramètres"}, lang:"FR", langToggle:"EN",
    dash:{title:"Tableau de bord",updated:"Mis à jour",activity:"Activité récente",calendar:"Calendrier fiscal 2025"},
    docs:{title:"Gestion documentaire RAG",knowledge:"Sources de connaissance métier",client:"Documents client",upload:"Glissez vos fichiers ici",sub:"Cliquez pour parcourir à Dossier entier à Jusqu'à 500 MB/fichier à Stockage RAG illimité à Tous types",indexed:"✅ Indexé",staServerOnly:"Extraction côté serveur"},
    chat:{new:"Nouvelle conversation",send:"Envoyer",copy:"Copier",copied:"Copié !",export:"Exporter",retry:"Réessayer",routing:"Détection agent...",noConv:"Aucune conversation\nCommencez par envoyer un message",resume:"Conversation reprise",autoRouted:"Auto-routé vers"},
    agents:{title:"Annuaire des agents",startConv:"Démarrer une conversation",savePrompt:"Sauvegarder",cancel:"Annuler"},
    pipeline:{title:"Pipeline RAG · Observabilité",availability:"Disponibilité",latency:"Latence",errors:"Erreurs",sla:"✓",lastRun:"Dernier run"},
    governance:{title:"Gouvernance & Conformité",policies:"Politiques actives",catalog:"Catalogue données",owner:"Responsable",lastReview:"Dernière revue",nextAudit:"Prochain audit",status:{compliant:"Conforme",review:"é réviser",noncompliant:"Non conforme"}},
  },
  en: { nav:{dashboard:"Dashboard",chat:"AI Chat",documents:"Documents",pipeline:"RAG Pipeline",governance:"Governance",agents:"Agents",settings:"Settings"}, lang:"EN", langToggle:"FR",
    dash:{title:"Dashboard",updated:"Updated",activity:"Recent activity",calendar:"Fiscal calendar 2025"},
    docs:{title:"RAG Document Management",knowledge:"Business knowledge sources",client:"Client documents",upload:"Drag your files here",sub:"Click to browse à Folder upload à Up to 500 MB/file à Unlimited RAG storage à All types",indexed:"✅ Indexed",staServerOnly:"Server-side extraction"},
    chat:{new:"New conversation",send:"Send",copy:"Copy",copied:"Copied!",export:"Export",retry:"Retry",routing:"Detecting agent...",noConv:"No conversations\nStart by sending a message",resume:"Conversation resumed",autoRouted:"Auto-routed to"},
    agents:{title:"Agent directory",startConv:"Start a conversation",savePrompt:"Save",cancel:"Cancel"},
    pipeline:{title:"RAG Pipeline — Observability",availability:"Availability",latency:"Latency",errors:"Errors",sla:"SLA",lastRun:"Last run"},
    governance:{title:"Governance & Compliance",policies:"Active policies",catalog:"Data catalog",owner:"Owner",lastReview:"Last review",nextAudit:"Next audit",status:{compliant:"Compliant",review:"Needs review",noncompliant:"Non-compliant"}},
  }
};

//  API 
// Standard call — RAG agents (no web search)
export async function callClaude(system: string, messages: any[], openrouterKey: string) {
  // Routes through OpenRouter which supports Anthropic Claude models
  return callOpenRouter("deepseek/deepseek-v4-pro", system, messages, openrouterKey, false);
}

// Web-search-enabled call — VeilleAgent + SubventionsAgent
// Uses Anthropic web_search tool for real-time information
export async function callClaudeWithWebSearch(system: string, messages: any[], openrouterKey: string) {
  // Routes through OpenRouter with web search support
  return callOpenRouter("deepseek/deepseek-v4-pro", system, messages, openrouterKey, true);
}

// Route to correct API based on agent type and available key
const WEB_SEARCH_AGENTS = new Set(["VeilleAgent","SubventionsAgent"]);

//  SHARED UTILS 
// Web-search-enabled call — VeilleAgent + SubventionsAgent
// Uses Anthropic web_search tool for real-time information
// Route to correct API based on agent type and available key
const ORCHESTRATOR_PROMPT = {
  fr: `Tu es l'Orchestrateur du Bureau CPA Virtuel — le directeur coordinateur qui dirige une Équipe de 9 spécialistes CPA.

## Ton réle
Analyser chaque demande de l'utilisateur et décider de la meilleure stratégie de traitement :
- Quel(s) spécialiste(s) mobiliser
- Dans quel ordre (séquentiel) ou simultanément (parallèle)
- Avec quelle priorité

## Ton Équipe
1. **Sophie Mercier** (TaxAgent) — Fiscaliste CPA, M.Fisc. — T1/T2, TPS/TVQ, RS&DE, planification fiscale
2. **Alexandre Bouchard** (AuditAgent) — Auditeur CPA-CA senior — IFRS, ASPE, NCA, contrôles internes
3. **Natalie Chen** (CashFlowAgent) — Directrice trésorerie CTP — BFR, rolling forecast, covenants
4. **Isabelle Roy** (ComplianceAgent) — Conseillére DPO, LL.M. — Loi 25, CASL, PIPEDA, EFVP
5. **Marc Tremblay** (FinancialAgent) — Analyste CFA — ratios, benchmarks, évaluation entreprise
6. **Sarah Blackwell** (InvestmentAgent) — Analyste CFA/MBA — M&A, DCF, LBO, due diligence QoE
7. **Jean-François Lebel** (OCRAgent) — Spécialiste extraction — factures scannées, formulaires CRA/RQ
8. **Émilie Côté** (VeilleAgent) — Analyste veille — ARC, IFRS, AMF, Loi 25 (recherche web temps réel)
9. **Patrick Gagnon** (SubventionsAgent) — Expert subventions — SR&DE, IRAP, Investissement Québec (web)

## Types de workflows

### SINGLE — Requête simple, domaine unique
Exemples : "Quelle est la date limite T2?", "Calcule mon BAIIA", "Extrait cette facture"
é 1 spécialiste, réponse directe

### PARALLEL — Requête multi-domaines, analyses indépendantes
Exemples : "Analysez notre acquisition sous tous les angles", "Préparez notre rapport annuel"
é 2-4 spécialistes travaillent SIMULTANéMENT, synthèse finale
é Quand chaque analyse est indépendante et n'a pas besoin des autres

### SEQUENTIAL — Requête oé chaque étape alimente la suivante
Exemples : "évaluez si ce projet est viable fiscalement ET financièrement ET trouver des subventions"
é étape 1 à son output devient le contexte de l'étape 2 à etc.
é Quand l'analyse d'un spécialiste dépend des conclusions du précédent

### HYBRID — Mélange parallèle puis séquentiel
Exemples : "Nouveau projet tech : quelles subventions, quelle structure fiscale, et validez que c'est conforme"
é Phase 1 PARALLEL : Sophie (fiscal) + Isabelle (conformité)
é Phase 2 SEQUENTIAL : Patrick (subventions, avec contexte fiscal)

## Régles de priorité
- **URGENT** (=4) : délais règlementaires <30 jours, risques légaux, cotisations imminentes
- **ÉLEVÉE** (H) : décisions d'affaires importantes, opportunités financières, audit en cours
- **NORMALE** (M) : analyse stratégique, planification, optimisation
- **FAIBLE** (L) : veille, information générale, questions de fond

## Régles d'assignation intelligente
- Toujours mobiliser OCR en PREMIER si un document scanné est mentionné (Jean-François extrait, les autres analysent)
- Toujours mobiliser Veille si la demande concerne des mises à jour récentes ou l'actualité règlementaire
- Toujours mobiliser Subventions si un nouveau projet/investissement est mentionné
- Pour une acquisition : Sarah (investissement) + Sophie (fiscal) + Marc (financier) en parallèle
- Pour un audit : Alexandre seul OU Alexandre + Isabelle (conformité) si risques données
- Pour une restructuration : Sophie + Marc + Sarah en séquentiel (fiscal à financier à investissement)
- Pour un nouveau projet tech : Émilie (veille) + Patrick (subventions) en parallèle à Sophie (fiscal) séquentiel

## Format de réponse OBLIGATOIRE
Tu dois répondre UNIQUEMENT avec un objet JSON valide, sans texte avant ni aprés, sans markdown :
{
  "type": "single|parallel|sequential|hybrid",
  "priority": "urgent|high|normal|low",
  "agents": ["AgentId1", "AgentId2"],
  "phases": [
    {"type":"parallel","agents":["AgentId1","AgentId2"]},
    {"type":"sequential","agents":["AgentId3"]}
  ],
  "reason": "Explication en 1 phrase de pourquoi ce workflow",
  "user_message": "Message personnalisé à afficher à l'utilisateur (prénom des spécialistes mobilisés, ce qu'ils vont faire)",
  "estimated_seconds": 15,
  "synthesis_needed": true
}

Note : "phases" n'est utilisé que pour le type "hybrid". Pour single/parallel/sequential, utilise "agents".`,

  en: `You are the Virtual CPA Firm Orchestrator — the coordinating director managing a team of 9 CPA specialists.

## Your Role
Analyze each user request and decide the optimal processing strategy:
- Which specialist(s) to mobilize
- In what order (sequential) or simultaneously (parallel)
- With what priority

## Your Team
1. **Sophie Mercier** (TaxAgent) — CPA Tax Specialist — T1/T2, GST/QST, SR&ED, tax planning
2. **Alexandre Bouchard** (AuditAgent) — Senior CPA-CA Auditor — IFRS, ASPE, CAS, internal controls
3. **Natalie Chen** (CashFlowAgent) — CTP Treasury Director — working capital, rolling forecast, covenants
4. **Isabelle Roy** (ComplianceAgent) — DPO Advisor — Law 25, CASL, PIPEDA, DPIA
5. **Marc Tremblay** (FinancialAgent) — CFA Analyst — ratios, benchmarks, business valuation
6. **Sarah Blackwell** (InvestmentAgent) — CFA/MBA Analyst — M&A, DCF, LBO, QoE due diligence
7. **Jean-François Lebel** (OCRAgent) — Extraction Specialist — scanned invoices, CRA/RQ forms
8. **Émilie Côté** (VeilleAgent) — Watch Analyst — CRA, IFRS, AMF, Law 25 (real-time web search)
9. **Patrick Gagnon** (SubventionsAgent) — Grants Expert — SR&ED, IRAP, Investissement Québec (web)

## Workflow Types

### SINGLE — Simple request, single domain à 1 specialist
### PARALLEL — Multi-domain, independent analyses à 2-4 simultaneous à synthesis
### SEQUENTIAL — Each step feeds the next à chain of specialists
### HYBRID — Parallel phases followed by sequential steps

## Priority Rules
- **URGENT** (=4): regulatory deadlines <30 days, legal risks
- **HIGH** (H): important business decisions, active audits
- **NORMAL** (M): strategic analysis, planning, optimization
- **LOW** (L): monitoring, general information

## Smart Assignment Rules
- Always OCR first if scanned document mentioned (JF extracts, others analyze)
- Always Veille if recent regulatory updates requested
- Always Subventions if new project/investment mentioned
- Acquisition: Sarah + Sophie + Marc parallel
- New tech project: Émilie + Patrick parallel à Sophie sequential

## MANDATORY Response Format
Respond ONLY with valid JSON, no text before or after:
{
  "type": "single|parallel|sequential|hybrid",
  "priority": "urgent|high|normal|low",
  "agents": ["AgentId1", "AgentId2"],
  "phases": [{"type":"parallel","agents":["AgentId1"]},{"type":"sequential","agents":["AgentId2"]}],
  "reason": "1-sentence explanation",
  "user_message": "Message to user (specialist names, what they will do)",
  "estimated_seconds": 15,
  "synthesis_needed": true
}`
};

// Analyze request and return workflow plan
export async function analyzeWorkflow(query, historyMsgs, lang, openrouterKey) {
  if (!openrouterKey || !openrouterKey.trim()) {
    throw new Error(lang === "fr"
      ? "Clé API OpenRouter manquante. Configurez votre clé dans Paramètres."
      : "OpenRouter API key missing. Configure your key in Settings.");
  }
  const system = ORCHESTRATOR_PROMPT[lang] || ORCHESTRATOR_PROMPT.fr;
  const msgs = [
    ...historyMsgs.slice(-4).filter(m=>m.role!=="system"),
    { role:"user", content: `Analyse cette demande et retourne le plan de workflow JSON :\n\n"${query}"` }
  ];
  try {
    let raw;
    if (openrouterKey) {
      raw = await callOpenRouter(DEFAULT_AGENT_MODEL, system, msgs, openrouterKey, false);
    } else {
      raw = await callClaude(system, msgs, openrouterKey);
    }
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const plan = JSON.parse(jsonMatch[0]);
      // Validate agents exist
      if (plan.agents) plan.agents = plan.agents.filter(id => AGENTS_DEF.find(a=>a.id===id));
      return plan;
    }
  } catch(e) { console.warn("Orchestrator parse error:", e); }
  // Fallback: fast route
  const fast = fastRoute(query);
  return { type:"single", priority:"normal", agents:[fast||"FinancialAgent"],
    reason:"Routing automatique", user_message:"", estimated_seconds:10, synthesis_needed:false };
}

// Execute a workflow plan — returns array of {agentId, name, reply, status}
export async function executeWorkflow(plan, query, historyMsgs, agentSettings, openrouterKey, lang, onProgress) {
  const baseMessages = historyMsgs.slice(-6).filter(m=>m.role!=="system");
  const userMsg = { role:"user", content:query };

  const runOne = async (agentId, contextExtra="") => {
    const def = agentById(agentId);
    const prompt = agentSettings[agentId]?.prompt || (def.defaultPrompt?.[lang] ?? def.systemPrompt ?? "");
    const model  = agentSettings[agentId]?.model;
    const msgs = [...baseMessages, userMsg];
    if (contextExtra) msgs.push({ role:"user", content: contextExtra });
    onProgress?.(agentId, "working");
    try {
      const reply = await callAgent(agentId, prompt, msgs, openrouterKey, model);
      onProgress?.(agentId, "done");
      return { agentId, name:agentName(agentId, lang), title:agentTitle(agentId, lang), reply, status:"done" };
    } catch(e) {
      onProgress?.(agentId, "error");
      return { agentId, name:agentName(agentId, lang), title:agentTitle(agentId, lang), reply:`Erreur : ${e.message}`, status:"error" };
    }
  };

  if (plan.type === "single") {
    const result = await runOne(plan.agents[0]);
    return [result];
  }

  if (plan.type === "parallel") {
    return await Promise.all(plan.agents.map(id => runOne(id)));
  }

  if (plan.type === "sequential") {
    const results = [];
    let context = "";
    for (const agentId of plan.agents) {
      const result = await runOne(agentId, context);
      results.push(result);
      const n = agentName(agentId, lang);
      context = lang==="fr"
        ? `\n\n[Analyse préalable de ${n} :]:\n${result.reply}\n\n[Suite de la demande originale :]`
        : `\n\n[Prior analysis by ${n}:]:\n${result.reply}\n\n[Continuation of original request:]`;
    }
    return results;
  }

  if (plan.type === "hybrid" && plan.phases) {
    const results = [];
    let prevContext = "";
    for (const phase of plan.phases) {
      if (phase.type === "parallel") {
        const phaseResults = await Promise.all(phase.agents.map(id => runOne(id, prevContext)));
        results.push(...phaseResults);
        prevContext = phaseResults.map(r => `[${r.name}]: ${r.reply}`).join("\n\n");
      } else {
        for (const agentId of phase.agents) {
          const result = await runOne(agentId, prevContext);
          results.push(result);
          prevContext = `[${result.name}]: ${result.reply}`;
        }
      }
    }
    return results;
  }

  return [await runOne(plan.agents?.[0] || "FinancialAgent")];
}

// Synthesize multiple agent results into a unified response
export async function synthesizeResults(results, query, plan, lang, openrouterKey, agentSettings) {
  if (results.length <= 1) return null;
  const synthPrompt = lang === "fr"
    ? `Tu es l'Orchestrateur du Bureau CPA Virtuel. Plusieurs spécialistes ont analysé la demande suivante en parallèle ou en séquence. Tu dois maintenant synthétiser leurs analyses en une réponse unifiée, structurée et directement actionnable pour le client.

INSTRUCTIONS :
- Commence par un résumé exécutif de 3-5 points clés
- Intégre les recommandations complémentaires de chaque spécialiste sans répétition
- Mets en évidence les points de convergence et les tensions éventuelles entre analyses
- Termine par un plan d'action priorisé (URGENT / éLEVé / NORMAL) avec responsable suggéré
- Sois direct, pratique et orienté décision — pas de théorie
- Indique quel spécialiste a produit chaque analyse (prénom seulement)`
    : `You are the Virtual CPA Firm Orchestrator. Multiple specialists have analyzed the following request in parallel or sequentially. Synthesize their analyses into a unified, structured, directly actionable response.

INSTRUCTIONS:
- Start with a 3-5 point executive summary
- Integrate complementary recommendations without repetition
- Highlight convergence points and potential tensions
- End with a prioritized action plan (URGENT / HIGH / NORMAL) with suggested owner
- Be direct, practical, decision-oriented — no theory
- Indicate which specialist produced each analysis (first name only)`;

  const combined = results.map(r => `### ${r.name} — ${r.title}\n${r.reply}`).join("\n\n---\n\n");
  const msgs = [{ role:"user", content:`Demande originale :\n"${query}"\n\n${combined}` }];
  try {
    if (openrouterKey) return await callOpenRouter(DEFAULT_AGENT_MODEL, synthPrompt, msgs, openrouterKey, false);
    return await callClaude(synthPrompt, msgs, openrouterKey);
  } catch { return null; }
}

export async function callOpenRouter(model, system, messages, apiKey, useWebSearch = false) {
  const body = {
    model,
    messages: [{ role:"system", content:system }, ...messages.map(m=>({role:m.role,content:m.content}))],
    max_tokens: useWebSearch ? 2000 : 1400,
    ...(useWebSearch ? { plugins:[{ id:"web", max_results:5 }] } : {}),
  };
  const res = await fetch("/api/chat", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      ...(apiKey ? {"X-API-Key":apiKey} : {}),
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err?.error?.message || `OpenRouter ${res.status}`);
  }
  const d = await res.json();
  return d.choices?.[0]?.message?.content || "Erreur inattendue.";
}

export async function callAgent(agentId, system, messages, openrouterKey, agentModel) {
  const useWeb = WEB_SEARCH_AGENTS.has(agentId);
  // Priority: OpenRouter key à Anthropic direct
  if (openrouterKey) {
    const model = agentModel || DEFAULT_AGENT_MODEL;
    return callOpenRouter(model, system, messages, openrouterKey, useWeb);
  }
  // Fallback: Anthropic API direct (no web search for free tier)
  return useWeb
    ? callClaudeWithWebSearch(system, messages, openrouterKey)
    : callClaude(system, messages, openrouterKey);
}

export function fastRoute(msg) {
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

export async function routeViaAPI(msg) {
  try {
    const r = await callClaude("You are a routing agent. Given a user message, return ONLY the agent name — one of: TaxAgent, AuditAgent, CashFlowAgent, ComplianceAgent, FinancialAgent, InvestmentAgent, OCRAgent. Return nothing else.", [{role:"user",content:msg}], openrouterKey);
    const name = r.trim().replace(/[^a-zA-Z]/g,"");
    return AGENTS_DEF.find(a=>a.id===name)?.id || "FinancialAgent";
  } catch { return "FinancialAgent"; }
}

const card = (P, extra={}) => ({ background:P.card, border:`1px solid ${P.border}`, borderRadius:12, ...extra });

//  MOCK DATA 
const KNOWLEDGE_DOCS_INIT: any[] = []

const CLIENT_DOCS_INIT: any[] = []

const PIPELINE_DATA = [
  {id:"bronze",label:"Ingestion (Bronze)",icon:"⚖️",desc:"Upload, validation SHA-256, stockage S3 ca-central-1",metrics:{availability:"99.8%",latency:"1.2s",errors:"0.02%",sla:"✅"},status:"active",lastRun:"Il y a 4 min"},
  {id:"silver",label:"Traitement (Silver)",icon:"⚖️",desc:"Extraction texte (PyPDF2/python-docx), nettoyage, chunking 500 tokens",metrics:{availability:"99.5%",latency:"3.8s",errors:"0.1%",sla:"✅"},status:"active",lastRun:"Il y a 5 min"},
  {id:"gold",  label:"Embedding (Gold)",  icon:"(",desc:"HF multilingual-e5-large à pgvector 1024 dims",metrics:{availability:"99.9%",latency:"2.1s",errors:"0.0%",sla:"✅"},status:"active",lastRun:"Il y a 5 min"},
  {id:"ready", label:"Prêt à l'emploi",   icon:"✅",desc:"search_chunks() à cosine similarity à seuil 0.6 à EVV 9/10",metrics:{availability:"100%",latency:"0.4s",errors:"0.0%",sla:"✅"},status:"completed",lastRun:"En continu"},
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
  {label:{fr:"Fraécheur documents",     en:"Document freshness"},       value:"94.1%",trend:"-0.5%",status:"stable"},
  {label:{fr:"Couverture domaines",     en:"Domain coverage"},          value:"87.0%",trend:"+2.1%",status:"improving"},
  {label:{fr:"Taux d'indexation",       en:"Indexing rate"},            value:"99.2%",trend:"é",    status:"stable"},
];

//  ENHANCED UPLOAD ZONE (VectDocs-inspired) 


//  ORCHESTRATOR SYSTEM 
// The orchestrator is the brain of the virtual CPA firm.
// It analyzes each request, determines the optimal workflow (single/parallel/sequential),
// assigns the right specialists, coordinates execution, and synthesizes results.

// Execute a workflow plan — returns array of {agentId, name, reply, status}
//  MOCK DATA 
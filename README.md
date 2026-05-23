# 🎯 Z12 AI CFO Suite — v3.3

> **ZAKI OS Platform** · Bureau CPA Virtuel · Intelligence Financière IA pour PME Québécoises · Mai 2026

[![Version](https://img.shields.io/badge/version-3.3.0-10B981?style=for-the-badge)](https://github.com/zakibelm/Z12-AI-CFO-Suite)
[![Stack](https://img.shields.io/badge/React_18_+_TypeScript-3B82F6?style=for-the-badge)]()
[![Agents](https://img.shields.io/badge/9_Agents_CPA-6366F1?style=for-the-badge)]()
[![RAG](https://img.shields.io/badge/RAG_Illimité-F59E0B?style=for-the-badge)]()

---

## 🏢 Description

Z12 AI CFO Suite est un **bureau CPA virtuel complet** propulsé par l'IA, conçu pour les PME québécoises et canadiennes. Une équipe de 9 spécialistes nommés — coordonnés par un orchestrateur intelligent — couvre tous les domaines financiers et fiscaux canadiens.

---

## 👥 L'équipe CPA virtuelle

| 👤 Spécialiste | Titre | Domaine | Capacités |
|---|---|---|---|
| **Sophie Mercier** | Fiscaliste · CPA, M.Fisc. | Fiscalité canadienne | T1/T2, TPS/TVQ, RS&DE, DPA, planification |
| **Alexandre Bouchard** | Auditeur · CPA-CA | Audit & normes | NCA 200-810, IFRS, ASPE, NCECF |
| **Natalie Chen** | Dir. Trésorerie · CTP | Trésorerie & BFR | DSO/DPO/DIO, CCC, rolling forecast, covenants |
| **Isabelle Roy** | Conseillère · DPO, LL.M. | Conformité & vie privée | Loi 25, CASL, PIPEDA, EFVP |
| **Marc Tremblay** | Analyste · CFA | Analyse financière | Ratios, benchmarks, évaluation PME |
| **Sarah Blackwell** | Analyste · CFA, MBA | Investissement & M&A | DCF, LBO, TRI/VAN/MOIC, QoE |
| **Jean-François Lebel** | Spécialiste OCR | Extraction documentaire | Factures, T4/RL-1, relevés, validation TPS/TVQ |
| **Émilie Côté** | Analyste veille | Veille réglementaire | ARC, IFRS, AMF, Loi 25 · 🌐 **Web Search temps réel** |
| **Patrick Gagnon** | Expert subventions | Financement public | SR&DE, IRAP, IQ, CDAE, CLD · 🌐 **Web Search temps réel** |

---

## 🎯 Orchestrateur intelligent

L'orchestrateur est le cerveau de la plateforme. Il analyse chaque requête et détermine le workflow optimal :

```
SINGLE     → 1 spécialiste direct         "Date limite T2?"
PARALLEL   → Promise.all() simultané      "Analysez notre acquisition" → Sarah + Sophie + Marc
SEQUENTIAL → Output N → contexte N+1      "Veille → Subventions → Fiscal"
HYBRID     → Phases parallèles + séquentiel  "JF + Alex → Isabelle"
```

**Règles d'assignation intelligentes :**
- JF Lebel en PREMIER si document scanné → extraction avant analyse
- Émilie si mises à jour réglementaires → recherche web temps réel
- Patrick TOUJOURS si nouveau projet/investissement
- Acquisition → Sarah + Sophie + Marc en parallèle
- Synthèse automatique si multi-agents

---

## ⚡ Features

### Chat IA
- ✅ Orchestrateur comme point d'entrée unique (jamais un spécialiste directement)
- ✅ Auto-routing 2 niveaux : regex rapide → API Claude fallback
- ✅ Workflows parallèles, séquentiels et hybrides
- ✅ Surbrillance agents actifs (glow pulsant pendant l'exécution)
- ✅ Synthèse orchestrateur multi-agents
- ✅ Historique conversations persisté
- ✅ Export JSON conversations

### Documents RAG
- ✅ Stockage RAG **illimité** — jusqu'à 500 MB par fichier, tous types
- ✅ Extraction texte client-side instantanée (TXT/CSV/JSON/PDF)
- ✅ Auto-détection agent depuis nom + contenu (VectDocs-inspired)
- ✅ Détection langue 🇫🇷/🇬🇧 + estimation chunks
- ✅ Folder batch upload (`showDirectoryPicker()`)
- ✅ Search + Sort + Preview panel + Delete

### Paramètres
- ✅ Clé OpenRouter unique → 27 modèles, 9 fournisseurs
- ✅ Sélecteur de modèle par agent (grille visuelle)
- ✅ Éditeur prompt système par agent + Reset
- ✅ Test connexion API live

### UX
- ✅ Sidebar rétractable ☰/✕ avec animation
- ✅ Dark/Light mode
- ✅ FR/EN bilingue natif
- ✅ Tout persisté en localStorage

---

## 🏗️ Architecture

```
Frontend React (Vercel)
    ↓
Orchestrateur (analyzeWorkflow → plan JSON)
    ↓ single / parallel / sequential / hybrid
Spécialistes (9 agents) → callAgent()
    ├── callOpenRouter() — si clé disponible (27 modèles)
    └── callClaude() / callClaudeWithWebSearch() — fallback direct
    ↓
RAG Service
    ├── HF multilingual-e5-large (embeddings, FREE, 1024 dims)
    ├── Supabase pgvector (stockage illimité)
    └── search_chunks() cosine similarity, seuil 0.6
    ↓
Backend FastAPI (VPS 147.93.40.124)
    ├── Document processing (PyPDF2, python-docx)
    ├── Chunking 500 tokens
    └── AWS S3 ca-central-1 (Loi 25 — hébergement Canada)
```

### EVV Pattern — seuil 9/10
Toutes les analyses financières passent par EVV (Execute → Verify → Validate) avec le seuil qualité le plus élevé de l'écosystème ZAKI OS.

---

## 📦 Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| LLM Gateway | OpenRouter (27 modèles) + Anthropic direct (fallback) |
| Web Search | Anthropic `web_search_20250305` (Veille + Subventions) |
| RAG Vector DB | Supabase pgvector (1024 dims) |
| Embeddings | HF `intfloat/multilingual-e5-large` (GRATUIT) |
| Backend | FastAPI Python 3.11+ |
| Storage | AWS S3 `ca-central-1` (Loi 25 compliant) |
| Deploy | VPS Hostinger + Vercel |

---

## 🚀 Installation

```bash
# Clone
git clone https://github.com/zakibelm/Z12-AI-CFO-Suite.git
cd Z12-AI-CFO-Suite

# Install
npm install

# Configure (optionnel — fallback sur Anthropic direct sans clé)
echo "VITE_OPENROUTER_KEY=sk-or-v1-..." > .env.local

# Dev
npm run dev          # → http://localhost:3000

# Production
npm run build        # → dist/
```

---

## 📋 Commits

```
6b673fc feat: orchestrator greets user + active agent glow highlight
fe66616 feat: collapsible sidebar with hamburger icon ☰→✕
cddd178 feat: intelligent orchestrator — parallel/sequential/hybrid workflow
4c7f67a feat: rename agents with fictional person names — virtual CPA firm
0a398b5 feat: expert-level system prompts for all 9 agents
01d3c75 feat: Settings page — OpenRouter key + model selector + system prompt
7e86e8f feat: add VeilleAgent + SubventionsAgent (web search real-time)
387af56 feat: Phase 4+5 — OrchestratorPanel integration + memory endpoints (10/10)
9cff486 feat: Z12 AI CFO Suite v3.2 — Production ready
```

---

## 🔒 Conformité

- **Loi 25 (Québec)** — Hébergement ca-central-1, CPO nommé, audit trail, droit à l'effacement
- **CASL** — Double opt-in, désabonnement, logs consentement
- **PIPEDA** — Privacy by Design, notification violations DORS/2018-64
- **IFRS Disclosure** — Obligations de divulgation états financiers

---

## 🗺️ Position ZAKI OS

```
Z-CORE (Orchestrateur central · 121 agents)
└── Z12-CFO-Director
    ├── Sophie Mercier    (TaxAgent)
    ├── Alexandre Bouchard (AuditAgent)
    ├── Natalie Chen      (CashFlowAgent)
    ├── Isabelle Roy      (ComplianceAgent)
    ├── Marc Tremblay     (FinancialAgent)
    ├── Sarah Blackwell   (InvestmentAgent)
    ├── Jean-François Lebel (OCRAgent)
    ├── Émilie Côté       (VeilleAgent — 🌐)
    └── Patrick Gagnon    (SubventionsAgent — 🌐)
```

---

*Confidentiel — Zaki Belkhiter · ZAKI OS Platform · 2026*

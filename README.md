# Z12 AI CFO Suite — v3.1

> **ZAKI OS Platform** · Financial intelligence for Quebec SMEs · May 2026

![Z12 AI CFO Suite](https://img.shields.io/badge/ZAKI_OS-Z12_AI_CFO_Suite-10B981?style=for-the-badge)
![Version](https://img.shields.io/badge/version-3.1.0-blue?style=for-the-badge)
![Stack](https://img.shields.io/badge/React_18_+_TypeScript-3B82F6?style=for-the-badge)

---

## Overview

Z12 AI CFO Suite is a production-ready AI-powered financial intelligence platform for Quebec and Canadian SMEs. It provides 7 specialized agents backed by a unified RAG system (Supabase pgvector), all accessible through a clean bilingual (FR/EN) interface.

---

## Features

### 7 Specialized AI Agents
| Agent | Domain | LLM |
|---|---|---|
| TaxAgent | T1/T2 · TPS/TVQ · CRA · Revenu Québec | Claude Sonnet |
| AuditAgent | IFRS · ASPE · CPA Canada | Claude Sonnet |
| CashFlowAgent | Treasury · 13-week / 12-month forecasts | Claude Sonnet |
| ComplianceAgent | Loi 25 · CASL · PIPEDA | Claude Sonnet |
| FinancialAgent | Ratios · Benchmarks · Quebec SME | Claude Sonnet |
| InvestmentAgent | DCF / IRR / NPV · OSC/AMF | Claude Sonnet |
| OCRAgent | Scanned invoices · Handwritten docs | Claude Sonnet |

### Document Management (VectDocs-inspired)
- **Business knowledge sources** — CRA guides, IFRS standards, TVQ regulations, law texts
- **Client documents** — Financial statements, budgets, tax returns, contracts
- **Client-side text extraction** — Instant preview before server indexing (TXT/CSV/JSON/PDF)
- **Smart agent auto-detection** — Detects correct agent from filename + content keywords
- **Language detection** — FR/EN flag on each document
- **Chunk estimation** — Estimates chunk count before server processing
- **Folder batch upload** — `showDirectoryPicker()` API (Chrome/Edge)
- **Search + Sort + Preview panel** — Search across name/agent/content, expandable rows
- **Unlimited RAG storage** — No cap on indexed documents; up to 500 MB per file
- **All file types** — PDF, Word, Excel, PowerPoint, CSV, TXT, JSON, images, ZIP, email, audio, video

### Chat IA
- Auto-routing (2-level: fast regex → Claude API fallback, zero tokens for obvious cases)
- Persistent conversation history (localStorage)
- Resume any past conversation with full context
- Quick prompts per agent
- Copy message to clipboard
- Export conversation as JSON
- FR/EN bilingual prompts

### Pipeline RAG — Observability
- Bronze → Silver → Gold pipeline stages
- Real-time metrics: availability, latency, error rate, SLA
- Data quality tracking

### Governance
- Active compliance policies: Loi 25, CASL, PIPEDA, IFRS, CRA
- Data catalog with owners, retention, sensitivity
- Audit schedule tracking

### UX
- Dark / Light mode (persisted)
- FR / EN language toggle (persisted)
- Per-agent editable prompts + model via UI (persisted)
- `useLocalStorage` — all state persists across sessions
- `useMemo` / `useCallback` — zero unnecessary re-renders

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Inline styles (theme-aware dark/light) |
| State | React hooks + useLocalStorage |
| LLM Gateway | OpenRouter (Claude Sonnet, GPT-4o, etc.) |
| Vector DB | Supabase pgvector (1024 dims) |
| Embeddings | HF `intfloat/multilingual-e5-large` (free) |
| Orchestration | n8n webhooks (server-side) |
| Storage | AWS S3 ca-central-1 (Loi 25 compliant) |
| Deploy | VPS 147.93.40.124 + Vercel (frontend) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Set your Anthropic API key (for chat)
echo "VITE_ANTHROPIC_API_KEY=your_key_here" > .env.local

# Run dev server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
Z12-AI-CFO-Suite/
├── App.tsx          — Main application (all components)
├── index.tsx        — React entry point
├── index.html       — HTML shell
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .gitignore
```

---

## Architecture

```
Frontend (React/Vercel)
    ↓ REST + WebSocket
Backend (FastAPI / VPS)
    ↓
Agent Orchestrator (7 agents)
    ↓
RAG Service
    ├── HF multilingual-e5-large (embeddings, FREE)
    ├── Supabase pgvector (1024 dims, UNLIMITED)
    └── search_chunks() SQL function
    ↓
OpenRouter (LLM Gateway)
    ├── claude-sonnet-4 (analyses — all 7 agents)
    ├── gpt-4o (EVV validation judge)
    └── gemini-2.0-flash:free (routing/classification)
```

### EVV Pattern (Execute → Verify → Validate)
All financial analyses go through EVV with a **9/10 quality threshold** — the highest in the ZAKI OS ecosystem, reflecting the critical nature of financial data.

---

## Compliance

- **Loi 25 (Québec)** — Data hosted in Canada (S3 ca-central-1), explicit consent, right to erasure
- **CASL** — Double opt-in, unsubscribe mechanism, consent logs
- **PIPEDA** — Federal personal information protection
- **IFRS Disclosure** — Financial statement disclosure obligations

---

## ZAKI OS Ecosystem

```
Z-CORE (Orchestrator · 121 agents)
└── Z12-CFO-Agent ← this platform
    ├── TaxAgent
    ├── AuditAgent
    ├── CashFlowAgent
    ├── ComplianceAgent
    ├── FinancialAgent
    ├── InvestmentAgent
    └── OCRAgent
```

---

*Confidential — Zaki Belkhiter · ZAKI OS Platform · 2026*

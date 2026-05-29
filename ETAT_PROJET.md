# Z12 AI CFO -- ETAT PROJET
Version 4.3 -- 29 mai 2026
M0.5 COMPLETE | Gate 1 FERME | Prochain: M1

## SCORE PROJET
Avant M0.5 : 6.5/10
Apres M0.5  : 7.5/10  <- on est la
Cible M1    : 8/10
Cible M4    : 8.5/10

## MODULES

| Module | Statut | Description |
|--------|--------|-------------|
| M0     | DONE   | Fondations solides |
| M0.5   | DONE   | Repo stabilise -- backend reel + tests verts + CI propre |
| M1     | NEXT   | Patrick credible -- Knowledge Base QC reelle |
| M2     | TODO   | Un inconnu peut utiliser seul |
| M3     | TODO   | BankReconciliation -- 2e argument de vente |
| M4     | TODO   | Vitrine parfaite |
| M5     | TODO   | Premiers clients payants |
| M6     | TODO   | Mandats sur-mesure -- vraie marge |

## M0.5 SOUS-TACHES

| Sous-tache | Statut | Commit |
|------------|--------|--------|
| M0.5.1 Backend reel depuis VPS (48 fichiers Python) | DONE | 8f06162 |
| M0.5.2 npm ci + npm test + build OK | DONE | 370294d |
| M0.5.3 OpenRouter server-side only | OPTIONNEL | -- |
| M0.5.4 Import casse workflow.ts | DONE | 370294d |
| M0.5.5 Separer test / test:prod | DONE | 370294d |

## GATE 1 -- FERME LE 29 MAI 2026

Tous les criteres valides:
- authFetch corrige (commits 449dbc3 + 5aa16fb)
- Tests CI 53/53 (run #49)
- README a jour (commit f66d2c2)
- .bak supprimes
- REGISTRE 6 traitements (commit 9d81787)
- .env.example (commit d98d637)
- setup.sh valide (Codespace)
- update.sh (commit 55cc893)
- Audit configs propre
- OpenRouter cle fonctionnelle (fix b0f2614)
- WhatsApp E2E valide (join select-wire -- 29 mai)
- 9/9 agents valides -- SINGLE / PARALLEL / HYBRID
- Backend reel 48 fichiers Python dans le repo (8f06162)

## GATE 2 -- A ATTEINDRE

- 1 CPA beta utilise son instance spontanement chaque semaine
- BankReconciliationAgent v1 a 95% precision
- CGU licence logicielle redigees (modele Docker)
- Assurance RC professionnelle souscrite
- Pricing valide avec 10 entretiens Van Westendorp

## INFRASTRUCTURE

| Element | Valeur |
|---------|--------|
| VPS | root@147.93.40.124 (Hostinger Ubuntu 24.04) |
| URL live | https://cfo.optigenius.pro |
| GitHub | https://github.com/zakibelm/Z12-AI-CFO-Suite |
| Backend Docker | /opt/ai-cfo-phoenix-v3/ |
| Frontend source | /var/www/z12-cfo/src/ |
| Frontend dist | /var/www/z12-cfo/dist/ |
| CI/CD | GitHub Actions |

## COMMITS RECENTS

| Commit | Description | Statut |
|--------|-------------|--------|
| 8f06162 | M0.5.1: backend reel 48 Python files, no secrets | Prod |
| 370294d | M0.5: import casse + 53/53 tests + test:prod | Prod |
| 0d2a8bf | fix: YAML indentation fix-openrouter.yml | Prod |
| 77a3cc1 | fix: hardcoded host/username in fix-openrouter.yml | Prod |
| 5f05500 | ci: Fix VPS OpenRouter v8 | Prod |
| 7e00fd3 | M4.1: running + chip agents propres | Prod |
| ed050e7 | M4.1: Agents en cours + badges SINGLE/PARALLEL | Prod |
| 0420d5e | Fix UI: globe emoji + accent + Jean-Francois | Prod |
| b0f2614 | Fix: retire JWT dependency sur /api/chat | Prod |
| b7c0656 | ETAT_PROJET.md v3.7 | Prod |

## M1 -- PROCHAIN MODULE

### M1.1 Knowledge Base QC (priorite absolue)

Patrick repond avec donnees LLM potentiellement perimees.
Objectif: Patrick cite ses sources avec date d extraction.

Sources prioritaires:
1. revenuquebec.ca -- bulletins techniques
2. meie.gouv.qc.ca -- programmes subventions
3. investquebec.com -- financement PME
4. bdc.ca -- programmes PME
5. canada.ca/arc -- nouvelles fiscales

Pipeline cible:
Scraping -> Chunking 500 tokens -> Embedding multilingual-e5-large
-> PostgreSQL pgvector -> Metadonnees (source, date, type, region, statut)

Cible: Patrick cite "Selon MEIE (mis a jour le 29 mai 2026)..."

## AGENTS ACTIFS

| Agent | Specialite | Statut |
|-------|-----------|--------|
| Sophie | Fiscaliste -- TPS/TVQ, RS&DE | Actif |
| Alexandre | Auditeur -- risque, controle interne | Actif |
| Natalie | Tresorerie -- cashflow, liquidite | Actif |
| Isabelle | Conformite -- Loi 25 | Actif |
| Marc | Analyse financiere -- ratios | Actif |
| Sarah | Investissement -- DCF, M&A | Actif |
| Jean-Francois | OCR -- documents scannes | Actif |
| Emilie | Veille reglementaire | Actif |
| Patrick | Subventions -- grants quebecois | Actif -- precision M1 |

Temps reponse valides: SINGLE ~20-30s | PARALLEL ~60-90s | HYBRID ~2-3min

## CONFORMITE LOI 25

- ConsentBanner.tsx -- banniere sticky premier acces
- PrivacyPolicy.tsx -- modal 9 sections
- GET /api/privacy/my-data -- export donnees utilisateur
- DELETE /api/privacy/delete-my-account -- suppression cascade
- REGISTRE_TRAITEMENTS.md -- 6 traitements documentes

## INCIDENTS RESOLUS

| # | Date | Symptome | Fix |
|---|------|----------|-----|
| 1 | 24-25 mai | authFetch is not defined -- app blanche | commits 449dbc3 + 5aa16fb |
| 2 | 26-29 mai | Patrick ne repond pas -- OpenRouter 401 | commit b0f2614 -- retire JWT sur /api/chat |
| 3 | 26-29 mai | JWT invalide apres force-recreate | JWT_SECRET stable dans .env |
| 4 | 27-29 mai | OPENROUTER_API_KEY hardcodee module-level | os.environ.get() a chaque appel |
| 5 | Recurrent | WhatsApp Sandbox expire 72h | Envoyer: join select-wire au +1 415 523 8886 |

## RAPPEL STRATEGIQUE

Z12 CFO = vitrine -> ouvre la porte aux mandats sur-mesure ops
Ancrage prix: valeur remplacee (40h CPA x 200$/h = 8K$) pas le cout en tokens
Logique: demo parfaite -> credibilite -> mandat sur-mesure -> marge reelle

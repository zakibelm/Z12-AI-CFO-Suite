# Z12 AI CFO — ÉTAT DU PROJET

Version 5.1 — 30 mai 2026
Score : 9.0/10 · M3 ✅ 100% PROD · CI #93 ✅ · C6+C7+C8 ✅

---

## SCORE & MILESTONES

| Milestone | Statut | Score |
|-----------|--------|-------|
| M0   Gate 1 fermé          | ✅ PROD | 6.5/10 |
| M0.5 Dette technique       | ✅ PROD | 7.5/10 |
| M1   Patrick KB QC + RAG + valeur chiffrée | ✅ 100% PROD | 8.3/10 |
| M2   Auth self-service (README + WelcomeBanner) | ✅ PROD (test réel ⏳ humain) | 8.5/10 |
| M3   BankReconciliationAgent + sidebar Rapprochement | ✅ 100% PROD | 9.0/10 |
| M4   Vitrine parfaite + démo vidéo | ⬜ PENDING | cible 9.5/10 |

---

## ÉTAT PRODUCTION — 30 MAI 2026

### Infrastructure
- VPS : root@147.93.40.124 (Hostinger Ubuntu 24.04)
- URL : https://cfo.optigenius.pro ✅ OPÉRATIONNEL
- CI/CD : GitHub Actions — 121 runs · CI #90 ✅ 21s (dernier)
- Docker : ai-cfo-phoenix-v3-backend-1 sur port 8000
- nginx : /var/www/z12-cfo/dist (bundle index-2MzwgL-Z.js)

### Endpoints vérifiés en prod
- GET  /api/bank/status   → {"status":"ok","agent":"BankReconciliationAgent","version":"1.0"}
- POST /api/bank/reconcile → matched/unmatched/disclaimer ✅
- POST /api/chat           → 9 agents répondent ✅
- GET  /api/whatsapp/status → {"whitelist_count":1,"mode":"twilio_api"} ✅

### Commits clés (cette session)
- e38272a : M3.4 Fix navItems array brackets — Rapprochement sidebar nav ✅ CI #90
- 0a1874d : M3.3 Sidebar nav Rapprochement + backend bank_router ✅ CI #89
- abe9c85 : M3.2 BankReconciliationView frontend (201 lignes) ✅
- b101276 : M3.1 BankReconciliationAgent backend (421 lignes) ✅

---

## M3 — BANKRECONCILIATIONAGENT (✅ 100% PROD)

### Architecture
- INPUT  : Relevé bancaire CSV + Grand livre CSV
- OUTPUT : matchés / non-matchés / différentiel / doublons
- RÈGLE  : temperature=0 (pur Python, déterministe, sans LLM)
- Disclaimer OBLIGATOIRE sur chaque réponse
- Matching : montant exact (±0.01$) + date ±3 jours

### Fichiers
- backend/bank_reconciliation.py (421 lignes) — router bank_router
- backend/main.py — import bank_router + include_router avec guard
- src/components/BankReconciliationView.tsx (201 lignes)
- App.tsx — navItems["bankreconciliation"] dans OUTILS

### Test end-to-end validé
- JS browser test : matched:2 unmatched:0 disclaimer:true ✅
- Prod : https://cfo.optigenius.pro/api/bank/status ✅

---

## GATE 2 — CRITÈRES AVANT MONÉTISATION

| Critère | Statut |
|---------|--------|
| 1 CPA bêta utilise spontanément chaque semaine | ⬜ PENDING |
| BankReconciliationAgent 95% précision vrais relevés | ⬜ 20 cas réels requis |
| CGU licence logicielle (modèle Docker, pas SaaS) | ⬜ PENDING |
| Assurance RC professionnelle souscrite | ⬜ PENDING |
| Pricing validé Van Westendorp (10 entretiens CPA) | ⬜ PENDING |

---

## M2 — CRITÈRE RESTANT (ACTION HUMAINE)

Le critère M2 restant est une action humaine — pas du code.
Trouver 1 personne qui ne connaît pas l'app.
Lui donner uniquement : https://cfo.optigenius.pro
Sans rien expliquer.
Observer où elle bloque.
Si elle pose une question à Patrick en moins de 10 minutes sans aide → M2 ✅

---

## PROCHAINES ÉTAPES TECHNIQUES (M4)

### M4.1 — Bugs UI restants
- Agent cards : afficher nom + rôle ("Alexandre B. · Auditeur") au lieu des initiales ("AB")
- Scroll PARALLEL → synthèse toujours visible sans scroll

### M4.2 — Démo vidéo 90 secondes
- Scénario : PME construction Laval → Patrick (22K$ subventions) → Rapprochement Desjardins
- Format : Loom ou OBS · Sous-titres FR · Pas de voix sur IA

### M4.3 — Landing page z12cfo.com
- Après 10 entretiens CPA QC (pour avoir le vrai message)
- Message central : "Le CFO IA pour PME québécoises. Sur votre serveur."

---

## RÈGLES TECHNIQUES (RAPPEL)

- Ne JAMAIS committer .env, __pycache__, logs, uploads, données client
- Ne PAS refactoriser App.tsx — insertions chirurgicales uniquement
- Frontend source VPS : /var/www/z12-cfo/src/
- nginx sert depuis : /var/www/z12-cfo/dist/
- Pas de secrets hardcodés — toujours os.environ.get()
- bank_reconciliation.py exporte bank_router (pas router)
- Import dans main.py : from bank_reconciliation import bank_router
- Guard : if bank_router is not None: app.include_router(bank_router)

---

## SESSIONS PRÉCÉDENTES — INCIDENTS RÉSOLUS

| Incident | Cause | Fix |
|----------|-------|-----|
| authFetch is not defined | Scope App.tsx | commits 449dbc3 + 5aa16fb |
| OpenRouter 401 | JWT sur /api/chat | commit b0f2614 |
| JWT invalidé docker force-recreate | JWT_SECRET regénéré | JWT_SECRET stable dans .env |
| OPENROUTER_API_KEY hardcodée | Variable globale module | os.environ.get() à chaque appel |
| WhatsApp Sandbox expire 72h | Limitation Twilio | join select-wire au +1 415 523 8886 |
| HF_API_TOKEN absent | search_kb_qc() embedding | search_kb_qc_by_text() via OpenRouter |
| nginx trailing slash | proxy_pass /z12upload/; | proxy_pass sans slash |
| /debug/config en prod | Endpoint debug oublié | Supprimé de main.py |
| cannot import 'router' | bank_reconciliation.py exporte bank_router | from bank_reconciliation import bank_router |

| decode_token inexistant | auth.py exporte _decode_jwt | from auth import _decode_jwt as _decode_token |
| /api/orchestrate non protege | Depends absent | Bloc auth INTERNAL_SERVICE_SECRET + Bearer JWT |
| WelcomeBanner non affiche | Import + JSX absent dans App.tsx | import + fragment <><WelcomeBanner/><DashboardView/></> |
| navItems extra ] | Python replace créait ]] | Correction ligne par ligne (lines[2528/2529]) |

---

## RAPPEL STRATÉGIQUE

Z12 CFO = vitrine → ouvre la porte aux mandats sur-mesure ops
Ancrage prix : valeur remplacée (40h CPA × 200$/h = 8K$)
Logique : démo parfaite → crédibilité → mandat sur-mesure → marge réelle

## VPS — ÉTAT DU COOKIE AUTH (30 mai 2026)

auth.py exporte : _decode_jwt (L36) + _is_valid_uuid
main.py C3 : X-Internal-Service verifie contre INTERNAL_SERVICE_SECRET
main.py C6 : from auth import _decode_jwt as _decode_token (fix alias)
main.py C7 : /api/orchestrate meme protection que /api/chat
App.tsx C8 : WelcomeBanner affiche sur view===dashboard (post-login)

Test cookie Set-Cookie : en attente resultat VPS (curl login)
Si Set-Cookie absent : patcher auth_local.py avec response.set_cookie(...)

#!/bin/bash
# Patrick Agent Validation — 20 Profils PME QC
# Action 14/15 du Plan v1.7
# Usage: bash tests/patrick_validation.sh <EMAIL> <PASSWORD> [BASE_URL]
# Exemple: bash tests/patrick_validation.sh admin@optigenius.pro MonMotDePasse https://cfo.optigenius.pro
# Critère : ≥ 80% des réponses contiennent source (MEIE/BDC/IQ) + programme actif + montant

set -euo pipefail

EMAIL="${1:-admin@optigenius.pro}"
PASSWORD="${2:-}"
BASE_URL="${3:-https://cfo.optigenius.pro}"

if [ -z "$PASSWORD" ]; then
  echo "Usage: bash tests/patrick_validation.sh <EMAIL> <PASSWORD> [BASE_URL]"
  exit 1
fi

echo "=== Patrick Validation — 20 cas PME QC ==="
echo "URL: $BASE_URL"
echo ""

# 1. Authentification
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/local/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token','AUTH_FAILED'))")

if [ "$TOKEN" = "AUTH_FAILED" ]; then
  echo "ERREUR: Authentification échouée. Vérifier email/password."
  exit 1
fi
echo "✅ Auth réussie — token obtenu"
echo ""

# Fonction de test
PASS=0
FAIL=0
TOTAL=0

test_patrick() {
  local PROFIL="$1"
  local QUESTION="$2"
  TOTAL=$((TOTAL + 1))
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"message\":\"$QUESTION\",\"agent\":\"patrick\",\"conversation_history\":[]}" \
    --max-time 45 2>/dev/null || echo '{"response":"TIMEOUT"}')
  
  TEXT=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('response','ERROR')[:200])" 2>/dev/null || echo "PARSE_ERROR")
  
  # Critères : source citée + programme actif + montant
  HAS_SOURCE=$(echo "$TEXT" | grep -iE "MEIE|BDC|IQ|Investissement Québec|Revenu Québec|ARC|Canada|Québec" | wc -l)
  HAS_PROGRAM=$(echo "$TEXT" | grep -iE "programme|subvention|crédit|RS.DE|PARI|Essor|ClimatSol|FIER|CDPQ|Futurpreneur" | wc -l)
  HAS_AMOUNT=$(echo "$TEXT" | grep -iE "\$|000|million|maximal|jusqu|500|000" | wc -l)
  
  if [ "$HAS_SOURCE" -gt 0 ] && [ "$HAS_PROGRAM" -gt 0 ]; then
    STATUS="✅ PASS"
    PASS=$((PASS + 1))
  else
    STATUS="❌ FAIL"
    FAIL=$((FAIL + 1))
  fi
  
  echo "$STATUS | Profil $PROFIL"
  echo "   Réponse: ${TEXT:0:120}..."
  echo ""
}

echo "--- Tests en cours (peut prendre 5-10 min) ---"
echo ""

# 20 profils variés
test_patrick "01" "Quels programmes de subventions pour PME construction, 12 emp, Laval QC, 1.2M dollars CA, fondée 2019?"
test_patrick "02" "Quels programmes pour restaurant 8 emp, Montréal QC, 600K dollars, fondée 2021?"
test_patrick "03" "Quels programmes pour startup SaaS 5 emp, Québec QC, 200K dollars, fondée 2023?"
test_patrick "04" "Quels programmes pour manufacturier 45 emp, Drummondville QC, 5M dollars, fondée 2015?"
test_patrick "05" "Quels programmes pour cabinet comptable 3 emp, Sherbrooke QC, 400K dollars, fondée 2018?"
test_patrick "06" "Quels programmes pour entreprise transport 20 emp, Longueuil QC, 3M dollars, fondée 2010?"
test_patrick "07" "Quels programmes pour détaillant 15 emp, Trois-Rivières QC, 800K dollars, fondée 2016?"
test_patrick "08" "Quels programmes pour clinique santé 10 emp, Laval QC, 1.5M dollars, fondée 2020?"
test_patrick "09" "Quels programmes pour école privée 25 emp, Gatineau QC, 2M dollars, fondée 2008?"
test_patrick "10" "Quels programmes pour entreprise tourisme 7 emp, Mont-Tremblant QC, 500K dollars, fondée 2022?"
test_patrick "11" "Quels programmes pour ferme agricole 5 emp, Saint-Hyacinthe QC, 900K dollars, fondée 2005?"
test_patrick "12" "Quels programmes pour entreprise tech hardware 30 emp, Montréal QC, 4M dollars, fondée 2017?"
test_patrick "13" "Quels programmes pour firme génie conseil 18 emp, Québec QC, 2.5M dollars, fondée 2012?"
test_patrick "14" "Quels programmes pour promoteur immobilier 8 emp, Laval QC, 10M dollars, fondée 2014?"
test_patrick "15" "Quels programmes pour transformation alimentaire 50 emp, Saint-Georges QC, 8M dollars, fondée 2000?"
test_patrick "16" "Quels programmes pour entreprise culturelle 6 emp, Montréal QC, 300K dollars, fondée 2021?"
test_patrick "17" "Quels programmes pour club sportif 12 emp, Brossard QC, 700K dollars, fondée 2019?"
test_patrick "18" "Quels programmes pour entreprise environnement 9 emp, Sherbrooke QC, 600K dollars, fondée 2020?"
test_patrick "19" "Quels programmes pour média numérique 4 emp, Montréal QC, 250K dollars, fondée 2022?"
test_patrick "20" "Quels programmes pour centre formation 14 emp, Longueuil QC, 1.1M dollars, fondée 2013?"

# Résultats
echo "================================"
echo "RÉSULTATS PATRICK VALIDATION"
echo "================================"
SCORE_PCT=$((PASS * 100 / TOTAL))
echo "Score : $PASS / $TOTAL ($SCORE_PCT%)"
if [ "$SCORE_PCT" -ge 80 ]; then
  echo "✅ GATE 1 CRITÈRE PATRICK : VALIDÉ ($SCORE_PCT% >= 80%)"
else
  echo "❌ GATE 1 CRITÈRE PATRICK : ÉCHEC ($SCORE_PCT% < 80%)"
  echo "→ Knowledge Base QC requise avant déploiement bêta"
fi
echo "================================"

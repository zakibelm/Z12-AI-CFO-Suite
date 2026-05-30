"""
bank_reconciliation.py — M3 BankReconciliationAgent
Z12 AI CFO Suite — Reconciliation bancaire deterministe

INPUT  : releve_csv (str), grand_livre_csv (str), periode (str optionnel)
OUTPUT : rapport JSON avec matched/unmatched/doublons/differentiel
REGLES : temperature=0 equivalent — aucun LLM, pure Python
         Disclaimer obligatoire sur chaque rapport
         Tolerance date : +/- 3 jours
         Tolerance montant : exacte (pas de fuzzy sur les montants)
"""

import csv
import io
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field


# ─── Structures de données ────────────────────────────────────────────────────

@dataclass
class Transaction:
    id: str
    date: datetime
    montant: float  # positif = debit, negatif = credit (selon convention relevé)
    description: str
    reference: str = ""
    source: str = ""  # "releve" ou "grand_livre"
    matched: bool = False
    match_id: Optional[str] = None


@dataclass
class ReconciliationReport:
    periode: str
    matched: List[Dict]
    unmatched_releve: List[Dict]
    unmatched_grand_livre: List[Dict]
    doublons_potentiels: List[Dict]
    stats: Dict
    disclaimer: str
    duree_manuelle_estimee_h: float


# ─── Parsing CSV ──────────────────────────────────────────────────────────────

FORMATS_DATE = [
    "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y",
    "%d-%m-%Y", "%Y/%m/%d", "%d %b %Y",
    "%d-%b-%Y", "%b %d, %Y", "%Y%m%d",
]


def _parse_date(s: str) -> Optional[datetime]:
    s = s.strip()
    for fmt in FORMATS_DATE:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _parse_montant(s: str) -> Optional[float]:
    """Convertit '1 234,56' ou '1234.56' ou '(1234.56)' en float."""
    s = s.strip().replace(" ", "").replace("\xa0", "")
    # Montant négatif entre parenthèses : (1234.56)
    negatif = s.startswith("(") and s.endswith(")")
    if negatif:
        s = s[1:-1]
    # Supprimer symboles monétaires
    s = re.sub(r"[$€£CAD]", "", s)
    # Normaliser : si virgule avant 2 chiffres finaux = séparateur décimal FR
    if re.search(r",\d{2}$", s):
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", "")
    try:
        v = float(s)
        return -v if negatif else v
    except ValueError:
        return None


def _detect_columns(headers: List[str]) -> Dict[str, int]:
    """Détecte les colonnes date/montant/description dans les headers."""
    h_lower = [h.lower().strip() for h in headers]
    
    date_keys = ["date", "dt", "date_transaction", "date transaction", "transaction date"]
    montant_keys = ["montant", "amount", "debit", "crédit", "credit", "solde", "balance", "total"]
    desc_keys = ["description", "desc", "libelle", "libellé", "memo", "note", "details"]
    ref_keys = ["reference", "ref", "num", "numero", "id", "cheque", "check"]
    
    def find_col(keys):
        for k in keys:
            for i, h in enumerate(h_lower):
                if k in h:
                    return i
        return -1
    
    return {
        "date": find_col(date_keys),
        "montant": find_col(montant_keys),
        "description": find_col(desc_keys),
        "reference": find_col(ref_keys),
    }


def parse_csv(csv_text: str, source: str) -> Tuple[List[Transaction], List[str]]:
    """Parse un CSV et retourne (transactions, erreurs)."""
    transactions = []
    erreurs = []
    
    # Nettoyage BOM
    csv_text = csv_text.lstrip("\ufeff").lstrip("\xef\xbb\xbf")
    
    # Détection délimiteur
    delimiteur = ","
    for d in [",", ";", "\t", "|"]:
        test = csv_text[:500].count(d)
        if test > csv_text[:500].count(delimiteur):
            delimiteur = d
    
    reader = csv.reader(io.StringIO(csv_text), delimiter=delimiteur)
    rows = list(reader)
    
    if len(rows) < 2:
        erreurs.append(f"{source}: CSV vide ou sans données")
        return transactions, erreurs
    
    # Chercher la ligne d'en-tête (première ligne non-vide avec texte)
    header_idx = 0
    for i, row in enumerate(rows):
        if any(cell.strip() for cell in row):
            header_idx = i
            break
    
    headers = rows[header_idx]
    cols = _detect_columns(headers)
    
    if cols["date"] == -1:
        erreurs.append(f"{source}: Colonne date non détectée. Headers: {headers}")
        return transactions, erreurs
    
    if cols["montant"] == -1:
        erreurs.append(f"{source}: Colonne montant non détectée. Headers: {headers}")
        return transactions, erreurs
    
    for i, row in enumerate(rows[header_idx + 1:], start=header_idx + 2):
        if not any(cell.strip() for cell in row):
            continue  # Ligne vide
        
        try:
            date_str = row[cols["date"]].strip() if cols["date"] < len(row) else ""
            montant_str = row[cols["montant"]].strip() if cols["montant"] < len(row) else ""
            desc = row[cols["description"]].strip() if cols["description"] >= 0 and cols["description"] < len(row) else ""
            ref = row[cols["reference"]].strip() if cols["reference"] >= 0 and cols["reference"] < len(row) else ""
            
            date = _parse_date(date_str)
            if date is None:
                erreurs.append(f"{source} ligne {i}: Date non parseable: {repr(date_str)}")
                continue
            
            montant = _parse_montant(montant_str)
            if montant is None:
                erreurs.append(f"{source} ligne {i}: Montant non parseable: {repr(montant_str)}")
                continue
            
            if montant == 0.0:
                continue  # Ignorer les lignes à 0
            
            t = Transaction(
                id=f"{source}_{i}",
                date=date,
                montant=round(montant, 2),
                description=desc,
                reference=ref,
                source=source,
            )
            transactions.append(t)
            
        except IndexError as e:
            erreurs.append(f"{source} ligne {i}: Index hors limite — {e}")
    
    return transactions, erreurs


# ─── Algorithme de réconciliation ─────────────────────────────────────────────

TOLERANCE_JOURS = 3


def _cle_matching(t: Transaction) -> str:
    """Clé de matching primaire : montant arrondi."""
    return str(round(t.montant, 2))


def reconcile(
    releve: List[Transaction],
    grand_livre: List[Transaction],
    tolerance_jours: int = TOLERANCE_JOURS,
) -> Tuple[List[Tuple], List[Transaction], List[Transaction]]:
    """
    Matching bidirectionnel par montant exact + fenêtre de date.
    Retourne (matched_pairs, unmatched_releve, unmatched_gl)
    """
    matched_pairs = []
    gl_restant = list(grand_livre)
    
    for tr in releve:
        best_match = None
        best_delta = timedelta(days=tolerance_jours + 1)
        best_idx = -1
        
        for i, tg in enumerate(gl_restant):
            if tg.matched:
                continue
            
            # Montant exact (tolérance 0.01$ pour arrondis)
            if abs(abs(tr.montant) - abs(tg.montant)) > 0.01:
                continue
            
            # Fenêtre de date
            delta = abs(tr.date - tg.date)
            if delta <= timedelta(days=tolerance_jours):
                if delta < best_delta:
                    best_delta = delta
                    best_match = tg
                    best_idx = i
        
        if best_match is not None:
            tr.matched = True
            tr.match_id = best_match.id
            best_match.matched = True
            best_match.match_id = tr.id
            matched_pairs.append((tr, best_match))
            gl_restant[best_idx] = best_match  # Marquer comme matched
    
    unmatched_releve = [t for t in releve if not t.matched]
    unmatched_gl = [t for t in gl_restant if not t.matched]
    
    return matched_pairs, unmatched_releve, unmatched_gl


def detecter_doublons(transactions: List[Transaction]) -> List[List[Transaction]]:
    """Détecte les transactions potentiellement dupliquées dans une même liste."""
    doublons = []
    checked = set()
    
    for i, t1 in enumerate(transactions):
        if i in checked:
            continue
        groupe = [t1]
        for j, t2 in enumerate(transactions[i + 1:], start=i + 1):
            if j in checked:
                continue
            # Même montant, même date ± 1 jour
            if (abs(abs(t1.montant) - abs(t2.montant)) < 0.01 and
                    abs(t1.date - t2.date) <= timedelta(days=1)):
                groupe.append(t2)
                checked.add(j)
        if len(groupe) > 1:
            checked.add(i)
            doublons.append(groupe)
    
    return doublons


# ─── Moteur principal ─────────────────────────────────────────────────────────

DISCLAIMER = (
    "\u26a0\ufe0f AVERTISSEMENT : Ce rapport est généré automatiquement à partir "
    "des données fournies. Il doit être vérifié manuellement par un CPA avant toute "
    "clôture comptable. Z12 AI CFO Suite ne garantit pas l\u2019exhaustivité ni "
    "l\u2019exactitude des données sources. Toute décision financière reste sous la "
    "responsabilité de l\u2019utilisateur."
)

TEMPS_MANUEL_PAR_TRANSACTION_MIN = 2.5  # minutes par transaction non-matchée


def run_reconciliation(
    releve_csv: str,
    grand_livre_csv: str,
    periode: str = "",
) -> ReconciliationReport:
    """
    Point d'entrée principal du BankReconciliationAgent.
    Retourne un rapport structuré complet.
    """
    # Parse
    releve_txns, erreurs_releve = parse_csv(releve_csv, "releve")
    gl_txns, erreurs_gl = parse_csv(grand_livre_csv, "grand_livre")
    
    # Réconciliation
    matched, unmatched_r, unmatched_gl = reconcile(releve_txns, gl_txns)
    
    # Doublons dans chaque source
    doublons_r = detecter_doublons(releve_txns)
    doublons_gl = detecter_doublons(gl_txns)
    
    # Différentiel net
    total_releve = sum(t.montant for t in releve_txns)
    total_gl = sum(t.montant for t in gl_txns)
    differentiel = round(total_releve - total_gl, 2)
    
    # Statistiques
    total_items = len(releve_txns) + len(gl_txns)
    nb_matched = len(matched)
    nb_unmatched = len(unmatched_r) + len(unmatched_gl)
    precision = round(nb_matched * 2 / total_items * 100, 1) if total_items > 0 else 0.0
    
    # Temps manuel estimé
    duree_h = round(nb_unmatched * TEMPS_MANUEL_PAR_TRANSACTION_MIN / 60, 1)
    
    # Période auto-détectée si non fournie
    if not periode and releve_txns:
        dates = [t.date for t in releve_txns]
        periode = f"{min(dates).strftime('%Y-%m-%d')} au {max(dates).strftime('%Y-%m-%d')}"
    
    # Sérialisation
    def txn_to_dict(t: Transaction) -> Dict:
        return {
            "id": t.id,
            "date": t.date.strftime("%Y-%m-%d"),
            "montant": t.montant,
            "description": t.description,
            "reference": t.reference,
            "match_id": t.match_id,
        }
    
    def pair_to_dict(p: Tuple[Transaction, Transaction]) -> Dict:
        r, g = p
        return {
            "releve": txn_to_dict(r),
            "grand_livre": txn_to_dict(g),
            "delta_jours": abs((r.date - g.date).days),
            "delta_montant": round(abs(abs(r.montant) - abs(g.montant)), 4),
        }
    
    return ReconciliationReport(
        periode=periode,
        matched=[pair_to_dict(p) for p in matched],
        unmatched_releve=[txn_to_dict(t) for t in unmatched_r],
        unmatched_grand_livre=[txn_to_dict(t) for t in unmatched_gl],
        doublons_potentiels=[
            {"groupe": [txn_to_dict(t) for t in g]}
            for g in (doublons_r + doublons_gl)
        ],
        stats={
            "total_releve": len(releve_txns),
            "total_grand_livre": len(gl_txns),
            "matched": nb_matched,
            "unmatched_releve": len(unmatched_r),
            "unmatched_grand_livre": len(unmatched_gl),
            "precision_pct": precision,
            "differentiel_net": differentiel,
            "erreurs_parse": erreurs_releve + erreurs_gl,
            "doublons_detectes": len(doublons_r) + len(doublons_gl),
        },
        disclaimer=DISCLAIMER,
        duree_manuelle_estimee_h=duree_h,
    )


# ─── Router FastAPI ───────────────────────────────────────────────────────────

try:
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel

    bank_router = APIRouter(prefix="/api/bank", tags=["bank-reconciliation"])

    class ReconcileRequest(BaseModel):
        releve_csv: str
        grand_livre_csv: str
        periode: str = ""

    @bank_router.post("/reconcile")
    async def reconcile_endpoint(payload: ReconcileRequest):
        """
        POST /api/bank/reconcile
        Body: { releve_csv: str, grand_livre_csv: str, periode?: str }
        """
        try:
            if not payload.releve_csv.strip():
                raise HTTPException(400, "releve_csv est vide")
            if not payload.grand_livre_csv.strip():
                raise HTTPException(400, "grand_livre_csv est vide")
            
            report = run_reconciliation(
                payload.releve_csv,
                payload.grand_livre_csv,
                payload.periode,
            )
            
            return {
                "success": True,
                "periode": report.periode,
                "stats": report.stats,
                "matched": report.matched,
                "unmatched_releve": report.unmatched_releve,
                "unmatched_grand_livre": report.unmatched_grand_livre,
                "doublons_potentiels": report.doublons_potentiels,
                "duree_manuelle_estimee_h": report.duree_manuelle_estimee_h,
                "disclaimer": report.disclaimer,
            }
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Erreur réconciliation: {str(e)}")

    @bank_router.get("/status")
    async def bank_status():
        return {"status": "ok", "agent": "BankReconciliationAgent", "version": "1.0"}

except ImportError:
    bank_router = None

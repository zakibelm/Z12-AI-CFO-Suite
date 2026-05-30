import React, { useState, useRef } from "react";

// BankReconciliationView - M3.2 Frontend UI
// Agent: BankReconciliationAgent | temperature=0 | deterministe

interface Transaction {
  id: string; date: string; montant: number; description: string;
  reference?: string; source: string; matched: boolean; match_id?: string;
}
interface ReconciliationStats {
  total_releve: number; total_grand_livre: number; matched: number;
  unmatched_releve: number; unmatched_grand_livre: number; doublons_detectes: number;
  precision_pct: number; montant_total_releve: number; montant_total_grand_livre: number;
  differentiel_net: number; duree_manuelle_estimee_h: number;
}
interface ReconciliationReport {
  matched: Transaction[]; unmatched_releve: Transaction[];
  unmatched_grand_livre: Transaction[]; doublons_potentiels: Transaction[];
  stats: ReconciliationStats; disclaimer: string; generated_at: string;
}
interface BankReconciliationViewProps { lang?: string; }

const API_BASE = "/api/bank";
function fmt(n: number): string {
  return n.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "12px 16px", border: "1px solid var(--line)", minWidth: 120 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "var(--accent)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function TxTable({ title, items, color, emptyMsg }: { title: string; items: Transaction[]; color: string; emptyMsg: string }) {
  if (items.length === 0) return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 14, color, margin: "0 0 8px 0" }}>{title}</h3>
      <div style={{ color: "var(--ink-3)", fontSize: 13, padding: "12px 16px", background: "var(--surface-2)", borderRadius: 6 }}>{emptyMsg}</div>
    </div>
  );
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 14, color, margin: "0 0 8px 0" }}>{title} ({items.length})</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "var(--surface-2)" }}>
            {["Date","Description","Montant ($)","Ref.","Source"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "var(--ink-3)", fontWeight: 600, borderBottom: "1px solid var(--line)" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map((tx, i) => (
              <tr key={tx.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--surface-2)" }}>
                <td style={{ padding: "5px 10px" }}>{tx.date}</td>
                <td style={{ padding: "5px 10px" }}>{tx.description}</td>
                <td style={{ padding: "5px 10px", color: tx.montant < 0 ? "#e55" : "var(--accent)", fontWeight: 600, textAlign: "right" }}>{fmt(tx.montant)}</td>
                <td style={{ padding: "5px 10px", color: "var(--ink-3)", fontSize: 11 }}>{tx.reference || "—"}</td>
                <td style={{ padding: "5px 10px", color: "var(--ink-2)", fontSize: 11 }}>{tx.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BankReconciliationView({ lang = "fr" }: BankReconciliationViewProps) {
  const [releveText, setReleveText] = useState("");
  const [grandLivreText, setGrandLivreText] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const releveRef = useRef<HTMLInputElement>(null);
  const glRef = useRef<HTMLInputElement>(null);
  const isFr = lang === "fr";

  const handleFileRead = (file: File, setter: (s: string) => void) => {
    const reader = new FileReader();
    reader.onload = e => setter((e.target?.result as string) || "");
    reader.readAsText(file, "utf-8");
  };

  const handleReconcile = async () => {
    if (!releveText.trim() || !grandLivreText.trim()) {
      setError(isFr ? "Veuillez fournir les deux fichiers CSV." : "Please provide both CSV files."); return;
    }
    setLoading(true); setError(null); setReport(null);
    try {
      const res = await fetch(API_BASE + "/reconcile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releve_csv: releveText, grand_livre_csv: grandLivreText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Erreur serveur" }));
        throw new Error(err.detail || "HTTP " + res.status);
      }
      setReport(await res.json());
    } catch (e: any) { setError(e.message || "Erreur inconnue");
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setReleveText(""); setGrandLivreText(""); setReport(null); setError(null);
    if (releveRef.current) releveRef.current.value = "";
    if (glRef.current) glRef.current.value = "";
  };
  const s = report?.stats;
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)", padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>&#127974;</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{isFr ? "Rapprochement Bancaire" : "Bank Reconciliation"}</h1>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--ink-3)" }}>
              {isFr ? "Agent deterministe · Matching montant+date (±3j) · 8-15h/mois automatisees" : "Deterministic agent · Amount+date matching (±3d) · 8-15h/month automated"}
            </p>
          </div>
        </div>
      </div>

      {!report && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "var(--surface-2)", border: "2px dashed var(--line)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>&#128196; {isFr ? "Releve Bancaire" : "Bank Statement"}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>CSV · Desjardins, BMO, RBC, TD...</div>
            <input type="file" accept=".csv,.txt" ref={releveRef}
              onChange={e => e.target.files?.[0] && handleFileRead(e.target.files[0], setReleveText)}
              style={{ width: "100%", fontSize: 12 }} />
            {releveText && <div style={{ marginTop: 6, fontSize: 11, color: "var(--accent)" }}>OK — {releveText.split("\n").length} {isFr ? "lignes" : "lines"}</div>}
            <textarea placeholder={isFr ? "Ou collez le CSV ici..." : "Or paste CSV here..."}
              value={releveText} onChange={e => setReleveText(e.target.value)} rows={4}
              style={{ width: "100%", marginTop: 10, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink)", fontSize: 11, padding: 8, resize: "vertical", boxSizing: "border-box", fontFamily: "monospace" }} />
          </div>
          <div style={{ background: "var(--surface-2)", border: "2px dashed var(--line)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>&#128202; {isFr ? "Grand Livre" : "General Ledger"}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>CSV · QuickBooks, Sage, Acomba...</div>
            <input type="file" accept=".csv,.txt" ref={glRef}
              onChange={e => e.target.files?.[0] && handleFileRead(e.target.files[0], setGrandLivreText)}
              style={{ width: "100%", fontSize: 12 }} />
            {grandLivreText && <div style={{ marginTop: 6, fontSize: 11, color: "var(--accent)" }}>OK — {grandLivreText.split("\n").length} {isFr ? "lignes" : "lines"}</div>}
            <textarea placeholder={isFr ? "Ou collez le CSV ici..." : "Or paste CSV here..."}
              value={grandLivreText} onChange={e => setGrandLivreText(e.target.value)} rows={4}
              style={{ width: "100%", marginTop: 10, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink)", fontSize: 11, padding: 8, resize: "vertical", boxSizing: "border-box", fontFamily: "monospace" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {!report ? (
          <button onClick={handleReconcile} disabled={loading}
            style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {loading ? (isFr ? "Analyse en cours..." : "Analyzing...") : (isFr ? "Lancer le Rapprochement" : "Run Reconciliation")}
          </button>
        ) : (
          <button onClick={handleReset}
            style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {isFr ? "Nouveau rapprochement" : "New reconciliation"}
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: "rgba(229,85,85,0.1)", border: "1px solid #e55", borderRadius: 8, padding: "12px 16px", color: "#e55", marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {report && s && (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
            <StatCard label={isFr ? "Matches" : "Matched"} value={s.matched} color="var(--accent)" />
            <StatCard label={isFr ? "Non-matches releve" : "Unmatched stmt"} value={s.unmatched_releve} color={s.unmatched_releve > 0 ? "orange" : "var(--ink-3)"} />
            <StatCard label={isFr ? "Non-matches GL" : "Unmatched GL"} value={s.unmatched_grand_livre} color={s.unmatched_grand_livre > 0 ? "orange" : "var(--ink-3)"} />
            <StatCard label={isFr ? "Doublons" : "Duplicates"} value={s.doublons_detectes} color={s.doublons_detectes > 0 ? "#e55" : "var(--ink-3)"} />
            <StatCard label="Precision" value={s.precision_pct.toFixed(1) + "%"} color={s.precision_pct >= 95 ? "var(--accent)" : "orange"} />
            <StatCard label={isFr ? "Differentiel ($)" : "Differential ($)"} value={fmt(s.differentiel_net)} color={Math.abs(s.differentiel_net) < 0.01 ? "var(--accent)" : "#e55"} />
            <StatCard label={isFr ? "Temps economise" : "Time saved"} value={"~" + s.duree_manuelle_estimee_h + "h"} color="var(--accent)" />
          </div>
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 16px", marginBottom: 24, fontSize: 12, display: "flex", gap: 24, flexWrap: "wrap" }}>
            <span><strong>Total releve:</strong> {fmt(s.montant_total_releve)} $</span>
            <span><strong>Total GL:</strong> {fmt(s.montant_total_grand_livre)} $</span>
            <span><strong>{isFr ? "Genere le:" : "Generated:"}</strong> {new Date(report.generated_at).toLocaleString()}</span>
          </div>
          <TxTable title={isFr ? "Transactions Matchees" : "Matched Transactions"} items={report.matched} color="var(--accent)" emptyMsg={isFr ? "Aucune matchee." : "None matched."} />
          <TxTable title={isFr ? "Non-matches - Releve" : "Unmatched - Statement"} items={report.unmatched_releve} color="orange" emptyMsg={isFr ? "Toutes matchees." : "All matched."} />
          <TxTable title={isFr ? "Non-matches - Grand Livre" : "Unmatched - GL"} items={report.unmatched_grand_livre} color="orange" emptyMsg={isFr ? "Toutes matchees." : "All matched."} />
          {report.doublons_potentiels.length > 0 && <TxTable title={isFr ? "Doublons Potentiels" : "Potential Duplicates"} items={report.doublons_potentiels} color="#e55" emptyMsg="" />}
          <div style={{ background: "rgba(245,176,50,0.08)", border: "1px solid orange", borderRadius: 8, padding: "12px 16px", fontSize: 12, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.6 }}>
            {report.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}

export default BankReconciliationView;
// src/components/DashboardView.tsx
import React from "react";
import Avatar from './Avatar';
import { AGENTS_STUDIO, A_STUDIO } from '../utils/agentsConfig';
import { PageHead, Spark } from './PageHead';

export function DashboardView({lang, t}) {
  const fr = lang === "fr";
  return (
    <main className="page" data-screen-label="Dashboard">
      <PageHead title={fr?"Tableau de bord":"Dashboard"} sub={fr?"Aperçu — Cabinet Belmeddah CPA à 14 mai 2026":"Overview — Belmeddah CPA à May 14, 2026"}
        actions={<><button className="btn">{fr?"Exporter":"Export"}</button><button className="btn btn-primary">+ {fr?"Nouvelle analyse":"New analysis"}</button></>}/>
      <div className="page-body">
        <div className="dash-grid">
          <div className="tile"><div className="tile-label">{fr?"Conversations":"Conversations"}</div><div className="tile-val">147</div><div className="tile-foot"><span className="tile-delta">↑ 23%</span><span>📅 {fr?"30 derniers jours":"last 30 days"}</span></div><Spark/></div>
          <div className="tile"><div className="tile-label">{fr?"Documents indexés":"Indexed documents"}</div><div className="tile-val">412</div><div className="tile-foot"><span className="tile-delta">↑ 8</span><span>📅 {fr?"cette semaine":"this week"}</span></div><Spark color="var(--gold)"/></div>
          <div className="tile"><div className="tile-label">{fr?"Workflows à mai":"Workflows à May"}</div><div className="tile-val">52</div><div className="tile-foot"><span style={{color:"var(--ink-3)"}}>{fr?"38 hybrid à 14 single":"38 hybrid à 14 single"}</span></div><Spark/></div>
          <div className="tile"><div className="tile-label">{fr?"Coût à mai":"Cost à May"}</div><div className="tile-val">38,40 $</div><div className="tile-foot"><span className="tile-delta neg">↓ 12%</span><span>↓ vs avril</span></div><Spark color="var(--warn)"/></div>
        </div>

        <div className="col-2">
          <div className="panel">
            <div className="panel-head"><div className="panel-title">{fr?"Calendrier fiscal — prochaines échéances":"Tax calendar — upcoming deadlines"}</div><span className="cal-tag">5</span></div>
            <div className="panel-body">
              {[
                {d:"31",m:fr?"MAI":"MAY",name:fr?"Acompte trimestriel T2 — SPCC":"Quarterly T2 instalment — CCPC",info:fr?"Trois clients concernés à 14 jours":"3 clients à 14 days",t:"urgent",tag:"T2"},
                {d:"15",m:"JUN",name:fr?"Remise TPS/TVQ — déclarants mensuels":"GST/QST remittance — monthly filers",info:fr?"7 clients à 29 jours":"7 clients à 29 days",t:"",tag:"TPS"},
                {d:"30",m:"JUN",name:fr?"T2 — fin d'exercice 31 décembre":"T2 — Dec 31 year-end",info:fr?"2 clients à 44 jours":"2 clients à 44 days",t:"",tag:"T2"},
                {d:"31",m:fr?"JUL":"JUL",name:fr?"RS&DE T661 — délai 18 mois":"SR&ED T661 — 18-month deadline",info:fr?"1 client à 75 jours à ~85 K$":"1 client à 75 days à ~$85K",t:"",tag:"R&D"},
                {d:"15",m:fr?"AOÛT":"AUG",name:fr?"Acompte T1 personnel":"Personal T1 instalment",info:fr?"4 clients à 90 jours":"4 clients à 90 days",t:"",tag:"T1"},
              ].map((r,i)=>(
                <div className="cal-row" key={i}>
                  <div className="cal-date">{r.d}<small>{r.m}</small></div>
                  <div className="cal-meta"><div className="cal-name">{r.name}</div><div className="cal-info">{r.info}</div></div>
                  <span className={"cal-tag " + r.t}>{r.tag}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">{fr?"Activité agents à 30 j":"Agent activity à 30d"}</div></div>
            <div className="act-list">
              {[
                ["TaxAgent",84],["FinancialAgent",72],["InvestmentAgent",58],["CashFlowAgent",46],
                ["AuditAgent",38],["ComplianceAgent",32],["SubventionsAgent",28],["VeilleAgent",22],["OCRAgent",18],
              ].map(([id,n])=>{
                const a = AGENTS_STUDIO.find((x:any)=>x.id===id);
                return (
                  <div className="act-row" key={id}>
                    <span className="act-name">{a.name.split(" ")[0]}</span>
                    <div className="act-bar"><div className="act-fill" style={{width:n+"%",background:a.color}}/></div>
                    <span className="act-num">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><div className="panel-title">{fr?"Conversations récentes":"Recent conversations"}</div><button className="btn">{fr?"Tout voir":"See all"}</button></div>
          <div className="panel-body">
            {[
              {title:fr?"évaluation acquisition — Atelier Boréal inc.":"Acquisition assessment — Atelier Boréal inc.", info:"#4521 à hybrid à 5 agents à 38s", agents:["OCRAgent","FinancialAgent","InvestmentAgent","TaxAgent","CashFlowAgent"]},
              {title:fr?"Subventions IA — startup techno Drummondville":"AI grants — Drummondville tech startup", info:"#4520 à sequential à 3 agents à 12s", agents:["VeilleAgent","SubventionsAgent","TaxAgent"]},
              {title:fr?"Diagnostic Loi 25 — application RH":"Law 25 review — HR application", info:"#4519 à single à 1 agent à 6s", agents:["ComplianceAgent"]},
              {title:fr?"Audit ASPE 2025 — Constructions Lévis ltée":"ASPE 2025 audit — Constructions Lévis ltd", info:"#4518 à parallel à 2 agents à 18s", agents:["AuditAgent","FinancialAgent"]},
              {title:fr?"Rolling forecast 13 sem. — distribution Québec":"13-wk rolling forecast — Quebec distribution", info:"#4517 à single à 1 agent à 8s", agents:["CashFlowAgent"]},
            ].map((c,i)=>(
              <div className="conv-row" key={i}>
                <div className="conv-text"><div className="conv-title">{c.title}</div><div className="conv-info">{c.info}</div></div>
                <div className="conv-stack">{c.agents.map(id=><Avatar key={id} agent={A_STUDIO[id]} size={22}/>)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

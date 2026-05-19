// src/components/PipelineView.tsx
import React from "react";
import { PageHead, Spark } from './PageHead';

export function PipelineView({lang, t}) {
  const fr = lang === "fr";
  const stages = [
    {tag:"BRONZE", name:fr?"Ingestion":"Ingestion", tech:"FastAPI à S3 ca-central-1", m:[["latence","1,2 s"],["sla","99,8%"],["files","412"]]},
    {tag:"SILVER", name:fr?"Traitement":"Processing", tech:"PyPDF2 à python-docx à NLP", m:[["latence","3,8 s"],["sla","99,5%"],["chunks","8 412"]]},
    {tag:"GOLD",   name:"Embedding",                tech:"HF e5-large à 1024d",       m:[["latence","2,1 s"],["sla","99,9%"],["vectors","8 412"]]},
    {tag:"READY",  name:fr?"Requête":"Query",       tech:"pgvector à cosine",         m:[["latence","0,4 s"],["sla","100%"],["queries","2,1k"]]},
  ];
  return (
    <main className="page" data-screen-label="RAG Pipeline">
      <PageHead title={fr?"Pipeline RAG":"RAG Pipeline"} sub={fr?"Bronze à Silver à Gold à Ready à Loi 25 conforme":"Bronze à Silver à Gold à Ready à Law 25 compliant"}
        actions={<button className="btn">{fr?"Voir logs":"View logs"}</button>}/>
      <div className="page-body">
        <div className="pipe-flow">
          {stages.map((s,i)=>(
            <div className="pipe-stage" key={s.tag}>
              <div className="pipe-stage-tag">{s.tag}</div>
              <div className="pipe-stage-name">{s.name}</div>
              <div className="pipe-stage-tech">{s.tech}</div>
              <div className="pipe-metrics">{s.m.map(([k,v])=>(<div className="pipe-metric" key={k}><small>{k}</small><strong>{v}</strong></div>))}</div>
              {i<3 && <div className="pipe-arrow">é</div>}
            </div>
          ))}
        </div>

        <div className="col-2">
          <div className="panel">
            <div className="panel-head"><div className="panel-title">{fr?"Throughput à 24 h":"Throughput à 24h"}</div><span className="cal-tag">{fr?"temps réel":"live"}</span></div>
            <div style={{padding:"18px 20px"}}>
              <svg viewBox="0 0 320 120" width="100%" height="120" style={{display:"block"}}>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.3"/><stop offset="1" stopColor="var(--accent)" stopOpacity="0"/></linearGradient></defs>
                <polyline fill="none" stroke="var(--accent)" strokeWidth="2" points="0,90 24,84 48,72 72,76 96,60 120,68 144,46 168,54 192,38 216,44 240,28 264,32 288,20 320,26"/>
                <polygon fill="url(#g1)" points="0,90 24,84 48,72 72,76 96,60 120,68 144,46 168,54 192,38 216,44 240,28 264,32 288,20 320,26 320,120 0,120"/>
              </svg>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--ink-3)",fontFamily:"Geist Mono",marginTop:6}}>
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>NOW</span>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">{fr?"Recherches RAG récentes":"Recent RAG searches"}</div></div>
            <div className="panel-body">
              {[
                ["BAIIA normalisé secteur 333","8 chunks · 0.84 cos","Marc"],
                ["RS&DE admissibilité salaires R&D","12 chunks · 0.78 cos","Sophie"],
                ["IFRS 16 contrats location","6 chunks · 0.81 cos","Alex"],
                ["DSO benchmark distribution QC","4 chunks · 0.72 cos","Natalie"],
              ].map((r,i)=>(
                <div className="conv-row" key={i}>
                  <div className="conv-text"><div className="conv-title mono" style={{fontSize:11.5}}>{r[0]}</div><div className="conv-info">{r[1]}</div></div>
                  <span className="cal-tag">{r[2]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

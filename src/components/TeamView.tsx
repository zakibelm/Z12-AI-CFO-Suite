// src/components/TeamView.tsx
import React from "react";
import Avatar from './Avatar';
import { AGENTS_STUDIO, AGENTS_DEF } from '../utils/agentsConfig';
import { PageHead, Spark } from './PageHead';

export function TeamView({lang, t}) {
  const fr = lang === "fr";
  return (
    <main className="page" data-screen-label="Team">
      <PageHead title={fr?"Équipe CPA virtuelle":"Virtual CPA Team"} sub={fr?"9 spécialistes à prompts éditables à Claude Sonnet 4.5":"9 specialists à editable prompts à Claude Sonnet 4.5"}
        actions={<button className="btn">{fr?"Diagramme d'Équipe":"Team diagram"}</button>}/>
      <div className="page-body">
        <div className="team-grid">
          {AGENTS_STUDIO.map((a:any)=>(
            <div className="team-card" key={a.id}>
              <div className="team-head">
                <Avatar agent={a} size={40}/>
                <div><div className="team-name">{a.name}</div><div className="team-role">{AGENTS_DEF.find(d=>d.id===a.id)?.personTitle?.[lang]||""}</div></div>
              </div>
              <div className="team-domain">{AGENTS_DEF.find(d=>d.id===a.id)?.domain?.[lang]||""}</div>
              <div className="team-foot">
                <span className="team-model">{AGENTS_DEF.find(d=>d.id===a.id)?.webSearch?"sonnet-4-5 + <":"sonnet-4-5"}</span>
                <button className="team-edit">{fr?"éditer prompt ✏️":"Edit prompt ✏️"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// src/components/SettingsView.tsx
import React from "react";
import Avatar from './Avatar';
import { AGENTS_STUDIO, AGENTS_DEF } from '../utils/agentsConfig';

export function SettingsView({ lang, t, openrouterKey, agentSettings }: any) {
  const fr = lang === "fr";
  const [key, setKey] = useLocalStorage("z12-openrouter-key", "");
  const [settings, setSettings] = useLocalStorage("z12-agent-settings", {});
  const [testResult, setTestResult] = React.useState<string>("");
  const [testing, setTesting] = React.useState(false);

  const testConnection = async () => {
    setTesting(true); setTestResult("");
    try {
      const r = await fetch("https://openrouter.ai/api/v1/models",{headers:{Authorization:`Bearer ${key}`}});
      if (r.ok) setTestResult(fr?"✅ Connexion réussie":"✅ Connection successful");
      else setTestResult(fr?"L Clé invalide":"L Invalid key");
    } catch { setTestResult(fr?"L Erreur réseau":"L Network error"); }
    setTesting(false);
  };

  const resetAgent = (agentId: string) => {
    const next = {...settings};
    delete next[agentId];
    setSettings(next);
  };

  return (
    <main className="page" data-screen-label="Settings">
      <header className="page-head">
        <div>
          <div className="page-title">{fr?"Paramètres":"Settings"}</div>
          <div className="page-sub">{fr?"OpenRouter à 27 modèles à 9 fournisseurs":"OpenRouter à 27 models à 9 providers"}</div>
        </div>
      </header>
      <div className="page-body" style={{maxWidth:880}}>
        <div className="set-card">
          <div className="set-h">{fr?"Clé API OpenRouter":"OpenRouter API key"}</div>
          <div className="set-sub">{fr?"Optionnel si OPENROUTER_API_KEY est configurée sur le serveur. La clé transite via le proxy /api/chat et n’est jamais exposée dans le navigateur.":"Optional if OPENROUTER_API_KEY is set on the server. The key transits via /api/chat proxy and is never exposed in the browser."}</div>
          <input className="set-input" value={key} onChange={(e: any)=>setKey(e.target.value)} type="password" placeholder="sk-or-v1-&"/>
          <div style={{display:"flex",gap:8,marginTop:12,alignItems:"center"}}>
            <button className="btn btn-primary" onClick={testConnection} disabled={testing}>
              {testing?(fr?"Test&":"Testing&"):(fr?"Tester connexion":"Test connection")}
            </button>
            <button className="btn" onClick={()=>setKey("")}>{fr?"Effacer":"Clear"}</button>
            {testResult && <span style={{fontSize:12.5,color:"var(--ink-2)"}}>{testResult}</span>}
          </div>
        </div>


        <div className="set-card">
          <div className="set-h">{fr?"Modèle assigné par agent":"Model assigned per agent"}</div>
          <div className="set-sub">{fr?"Claude Sonnet 4.5 par défaut. Override individuel ci-dessous.":"Claude Sonnet 4.5 default. Override per agent below."}</div>
          {AGENTS_DEF.map((a: any) => {
            const sa = AGENTS_STUDIO.find((x: any)=>x.id===a.id)||AGENTS_STUDIO[0];
            const cur = settings[a.id]?.model || "deepseek/deepseek-v4-pro";
            return (
              <div className="set-row" key={a.id}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Avatar agent={sa} size={26}/>
                  <div className="agent-name">{sa.name}</div>
                </div>
                <select className="set-select" value={cur} onChange={(e: any)=>setSettings({...settings,[a.id]:{...settings[a.id],model:e.target.value}})}>
                  {OPENROUTER_MODELS.map((m: any)=><option key={m.id} value={m.id}>{m.id.split("/").pop()}</option>)}
                </select>
                <button className="btn" onClick={()=>resetAgent(a.id)}>{fr?"Reset":"Reset"}</button>
              </div>
            );
          })}
        </div>

        <div className="set-card">
          <div className="set-h">{fr?"Préférences":"Preferences"}</div>
          <div className="set-row"><div>{fr?"Région données":"Data region"}</div><div className="set-select">S3 ca-central-1</div><div></div></div>
          <div className="set-row"><div>{fr?"Modèle orchestrateur":"Orchestrator model"}</div><div className="set-select">deepseek/deepseek-v4-pro-5</div><div></div></div>
          <div className="set-row"><div>{fr?"RAG — seuil cosinus":"RAG — cosine threshold"}</div><div className="set-select">0.6</div><div></div></div>
        </div>
      </div>
    </main>
  );
}

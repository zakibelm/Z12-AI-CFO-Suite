// src/components/Studio.tsx
import React from "react";
import { executeWorkflow, synthesizeResults, genTitle, agentById } from '../utils/workflow';
import { fmtTime, agentName, agentTitle } from '../utils/uiHelpers';
import Avatar from './Avatar';
import { AGENTS_STUDIO, A_STUDIO, AGENTS_DEF } from '../utils/agentsConfig';
import { OrchestratorPanel } from './OrchestratorPanel';

export function Studio({ t, P, lang, agentSettings, openrouterKey, convs, setConvs, activeId, setActiveId, setView }: any) {
  const { useState: _s, useEffect: _e, useRef: _r, useMemo: _m, useCallback: _c } = React;

  //  Core state 
  const [msgs,      setMsgs]      = _s<any[]>([]);
  const [input,     setInput]     = _s("");
  const [attachedFiles, setAttachedFiles] = _s([]);
  const fileInputRef = _r(null);
  const [loading,   setLoading]   = _s(false);
  const [routing,   setRouting]   = _s(false);
  const [workflow,  setWorkflow]  = _s<any>(null);
  const [wfSteps,   setWfSteps]   = _s<any[]>([]);
  const [synthesis, setSynthesis] = _s<string|null>(null);
  const [agentId,   setAgentId]   = _s(AGENTS_DEF[0].id);
  const [ctxTab,    setCtxTab]    = _s("workflow");
  const [webOn,     setWebOn]     = _s(false);
  const [ragOn,     setRagOn]     = _s(true);
  const [showRight, setShowRight] = _s(true);
  const [copied,    setCopied]    = _s<number|null>(null);
  const threadRef  = _r<HTMLDivElement>(null);
  const inputRef   = _r<HTMLTextAreaElement>(null);

  //  Orchestrator welcome 
  const orchWelcome = _m(() => [{
    role:"assistant", isOrchestrator:true, ts:Date.now(),
    content: lang==="fr"
      ? "🏢 **Orchestrateur — Bureau CPA Virtuel**\n\nBonjour ! Je coordonne une Équipe de **9 spécialistes CPA** à votre service :\n\n👩 **Sophie** à Fiscaliste  |  👨 **Alexandre** à Auditeur  |  👩 **Natalie** à Trésorerie\n👩 **Isabelle** à Conformité  |  👨 **Marc** à Analyse financière  |  👩 **Sarah** à Investissement\n📄 **Jean-François** à OCR  |  👩 **Émilie** à Veille  |  👨 **Patrick** à Subventions\n\nDécrivez votre demande — j\'analyse et j\'assigne les spécialistes appropriés."
      : "🏢 **Orchestrator — Virtual CPA Firm**\n\nHello! I coordinate a team of **9 CPA specialists** at your service:\n\n👩 **Sophie** à Tax  |  👨 **Alexandre** à Audit  |  👩 **Natalie** à Treasury\n👩 **Isabelle** à Compliance  |  👨 **Marc** à Financial analysis  |  👩 **Sarah** à Investment\n📄 **Jean-François** à OCR  |  👩 **Émilie** à Watch  |  👨 **Patrick** à Grants\n\nDescribe your request — I\'ll analyze and assign the most appropriate specialist(s)."
  }], [lang]);

  _e(() => { if(msgs.length===0) setMsgs(orchWelcome); }, [orchWelcome]);
  _e(() => { threadRef.current?.scrollTo({top:99999,behavior:"smooth"}); }, [msgs, loading]);

  //  File attach handler
const handleFileAttach = (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const newFiles = [];
  let pending = files.length;
  const done = () => { pending--; if (pending===0) setAttachedFiles(prev => [...prev, ...newFiles]); };
  files.forEach(file => {
    const isText = /.(txt|csv|md|json|xml|yaml|yml|log|sql|html|css|tsx|ts|js|py)$/i.test(file.name) || (file.type && file.type.startsWith("text/"));
    if (isText) {
      const r = new FileReader();
      r.onload = (ev) => { newFiles.push({name:file.name, content:(ev.target.result||"").slice(0,50000)}); done(); };
      r.onerror = () => { newFiles.push({name:file.name, content:"[Erreur]"}); done(); };
      r.readAsText(file, "utf-8");
    } else {
      const s = file.size>1048576 ? (file.size/1048576).toFixed(1)+" MB" : (file.size/1024).toFixed(0)+" KB";
      newFiles.push({name:file.name, content:"[Fichier: "+file.name+" | "+s+" | "+(file.type||"inconnu")+"]\nIndexez via Documents."});
      done();
    }
  });
  e.target.value = "";
};
  const send = _c(async () => {
    if (!input.trim() || loading) return;
    const filePrefix = attachedFiles.length>0 ? attachedFiles.map(f=>"[📎 "+f.name+"]\n---\n"+f.content+"\n---\n").join("") : "";
  const userMsg = {role:"user", content: filePrefix + input, ts:Date.now()};
    const draft   = [...msgs, userMsg];
    setMsgs(draft); setInput(""); setAttachedFiles([]); setWorkflow(null); setSynthesis(null); setWfSteps([]);

    setRouting(true);
    const plan = await analyzeWorkflow(input, draft, lang, openrouterKey);
    setRouting(false);
    setWorkflow(plan);

    const allIds  = plan.phases ? plan.phases.flatMap((p: any) => p.agents) : (plan.agents || []);
    const primary = allIds[0] || agentId;
    setWfSteps(allIds.map((id: string) => ({agentId:id, status:"pending"})));
    if (primary !== agentId) setAgentId(primary);

    setLoading(true);
    let finalReply = "", results: any[] = [];
    try {
      results = await executeWorkflow(
        plan, input, draft, agentSettings, openrouterKey, lang,
        (id: string, status: string) => setWfSteps((prev: any[]) => prev.map(s => s.agentId===id ? {...s,status} : s)),
        
      );
      if (results.length > 1 && plan.synthesis_needed !== false) {
        const synth = await synthesizeResults(results, input, plan, lang, openrouterKey, agentSettings);
        setSynthesis(synth);
        finalReply = synth || results.map((r: any) => `### ${r.name}\n${r.reply}`).join("\n\n---\n\n");
      } else {
        finalReply = results[0]?.reply || (lang==="fr" ? "Aucune réponse." : "No response.");
      }
    } catch(e: any) { finalReply = `L ${e.message}`; }

    const aiMsg: any = {role:"assistant", content:finalReply, agent:primary, ts:Date.now(), wfResults:results.length>1?results:null};
    const final = [...draft, aiMsg];
    setMsgs(final); setLoading(false);

    const now = new Date().toISOString();
    if (activeId) {
      setConvs((prev: any[]) => prev.map((co: any) => co.id===activeId ? {...co,messages:final,updatedAt:now,agentId:primary} : co));
    } else {
      const nc = {id:"cv_"+Date.now(), title:genTitle(input), agentId:primary, messages:final, createdAt:now, updatedAt:now};
      setConvs((prev: any[]) => [nc,...prev]); setActiveId(nc.id);
    }
  }, [input, loading, msgs, agentId, lang, agentSettings, activeId, openrouterKey, setConvs, setActiveId]);

  const copy = _c(async (text: string, i: number) => {
    try { await navigator.clipboard.writeText(text); setCopied(i); setTimeout(()=>setCopied(null),2000); } catch {}
  }, []);

  //  Render helpers 
  const renderText = (s: string) => s
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/^###\s(.+)$/gm,"<h4>$1</h4>")
    .replace(/^##\s(.+)$/gm,"<h3>$1</h3>")
    .replace(/^-\s(.+)$/gm,"<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s,"<ul>$1</ul>")
    .replace(/\n/g,"<br/>");

  //  Compute busy/done sets for roster highlight 
  const busyIds = _m(() => new Set(wfSteps.filter((s:any) => s.status==="working").map((s:any) => {
    const def = AGENTS_DEF.find((a:any) => a.id === s.agentId);
    return def?.id || s.agentId;
  })), [wfSteps]);
  const doneIds = _m(() => new Set(wfSteps.filter((s:any) => s.status==="done").map((s:any) => s.agentId)), [wfSteps]);

  //  QUICK PROMPTS 
  const quickPrompts = lang==="fr" ? [
    "📊 Analyse compléte de l\'entreprise",
    "💹 Diagnostic financier PME",
    "💰 Subventions disponibles 2026",
    "📋 Revue conformité Loi 25",
    "💸 évaluer une acquisition",
  ] : [
    "📊 Full company analysis",
    "💹 SME financial diagnostic",
    "💰 Available grants 2026",
    "📋 Law 25 compliance review",
    "📊 Evaluate an acquisition",
  ];

  return (
    <div style={{display:"flex",flex:1,overflow:"hidden",minWidth:0}}>
      {/*  Studio column: header + scrollable thread + sticky composer  */}
      <div className="studio">
        <header className="studio-head">
                  <div className="studio-head-l">
                    <div style={{minWidth:0}}>
                      <div className="thread-title">{lang==="fr"?"Orchestration Studio":"Orchestration Studio"}</div>
                      <div className="thread-meta">
                        {workflow ? `${workflow.type || "—"} à ${(workflow.agents||[]).length} agent${(workflow.agents||[]).length!==1?"s":""}` : (lang==="fr"?"Prêt — décrivez votre demande":"Ready — describe your request")}
                      </div>
                    </div>
                  </div>
                  <div className="studio-head-r">
                <button onClick={() => { const last = [...msgs].reverse().find((m) => m.role === "user"); if (last) { window.dispatchEvent(new CustomEvent("z12-orchestrate", {detail: {question: last.content}})); } }} style={{marginRight:"8px",padding:"4px 10px",borderRadius:"6px",border:"1px solid rgba(139,92,246,0.4)",background:"rgba(139,92,246,0.1)",cursor:"pointer",fontSize:"11px",color:"rgba(139,92,246,0.9)"}} title="Analyse multi-experts">
                  Multi-experts
                </button>
                    <button className="icon-btn" title={showRight?"Hide panel":"Show panel"} onClick={()=>setShowRight(v=>!v)}>
                      <svg viewBox="0 0 16 16" className="i"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M10 3v10"/></svg>
                    </button>
                  </div>
                </header>

        {/* Scrollable message thread */}
        <div className="thread" ref={threadRef}>
          <div className="thread-inner">
                      {msgs.map((m: any, i: number) => {
                        const ma = agentById(m.agent || agentId);
                        const isOrch = m.isOrchestrator;
                        const studioAgent = AGENTS_STUDIO.find((a: any) => a.id === (m.agent || agentId)) || AGENTS_STUDIO[0];
          
                        if (m.role === "user") return (
                          <div className="msg msg-user" key={i}>
                            <div className="msg-user-bubble" dangerouslySetInnerHTML={{__html:renderText(m.content)}}/>
                          </div>
                        );
          
                        return (
                          <div className="msg" key={i}>
                            {/* Orchestrator card */}
                            {isOrch ? (
                              <div className="orch-card">
                                <div className="orch-head">
                                  <div className="orch-mark">,</div>
                                  <div style={{minWidth:0}}>
                                    <div className="orch-title">{lang==="fr"?"Orchestrateur à Bureau CPA Virtuel":"Orchestrator à Virtual CPA Firm"}</div>
                                    <div className="orch-sub">9 {lang==="fr"?"spécialistes disponibles":"specialists available"}</div>
                                  </div>
                                </div>
                                <div style={{padding:"14px 18px",fontSize:13,lineHeight:1.65,color:"var(--ink-2)"}}
                                     dangerouslySetInnerHTML={{__html:renderText(m.content)}}/>
                              </div>
                            ) : (
                              /* Agent reply card */
                              <div className="orch-card">
                                <div className="orch-head">
                                  <Avatar agent={studioAgent} size={24}/>
                                  <div style={{minWidth:0}}>
                                    <div className="orch-title">{agentName(m.agent||agentId, lang)}</div>
                                    <div className="orch-sub mono">{agentTitle(m.agent||agentId, lang)}</div>
                                  </div>
                                  <div style={{marginLeft:"auto",fontSize:10.5,color:"var(--ink-3)",fontFamily:"Geist Mono,monospace"}}>
                                    {m.ts ? fmtTime(new Date(m.ts).toISOString()) : "—"}
                                  </div>
                                </div>
                                {/* Multi-agent attribution */}
                                {m.wfResults && m.wfResults.length > 1 && (
                                  <div style={{padding:"8px 18px 0",display:"flex",gap:6,flexWrap:"wrap" as any}}>
                                    {m.wfResults.map((r: any, ri: number) => {
                                      const sa = AGENTS_STUDIO.find((a: any) => a.id === r.agentId) || AGENTS_STUDIO[0];
                                      return (
                                        <span key={ri} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:99,fontSize:10.5,fontFamily:"Geist Mono,monospace",background:"var(--surface-2)",border:"1px solid var(--line)",color:"var(--ink-2)"}}>
                                          <Avatar agent={sa} size={14}/>{sa.name.split(" ")[0]}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                                <div style={{padding:"12px 18px 16px",fontSize:13,lineHeight:1.65,color:"var(--ink-2)"}}
                                     dangerouslySetInnerHTML={{__html:renderText(m.content)}}/>
                                {/* Copy button */}
                                <div style={{padding:"0 18px 12px",display:"flex",gap:8}}>
                                  <button onClick={()=>copy(m.content,i)} style={{fontSize:10.5,color:"var(--ink-3)",background:"transparent",border:"none",cursor:"pointer",padding:0}}>
                                    {copied===i?(lang==="fr"?"Copié ✓":"Copied ✓"):(lang==="fr"?"Copier":"Copy")}
                                  </button>
                                  <button onClick={()=>{localStorage.setItem("z12-sandbox-prefill",m.content);setView("sandbox");}}
                                    style={{fontSize:10.5,color:"var(--ink-3)",background:"transparent",border:"none",cursor:"pointer",padding:0}}>
                                    📊 {lang==="fr"?"Sandbox":"Sandbox"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
          
                      {/* Orchestrator analyzing + workflow status */}
                      {(routing || loading) && (
                        <div className="msg">
                          <div className="orch-card">
                            <div className="orch-head">
                              <div className="orch-mark">,</div>
                              <div style={{minWidth:0}}>
                                <div className="orch-title">
                                  {routing ? (lang==="fr"?"Analyse de la demande&":"Analyzing request&") : (lang==="fr"?"Agents en cours&":"Agents working&")}
                                </div>
                                <div className="orch-sub mono">
                                  {workflow ? `${workflow.type} à ${workflow.reason||""}` : ""}
                                </div>
                              </div>
                              {workflow?.priority==="urgent" && <div className="orch-pill" style={{background:"var(--warn-soft)",color:"var(--warn)",borderColor:"var(--warn)"}}>=4 URGENT</div>}
                              {workflow?.priority==="high"   && <div className="orch-pill" style={{background:"var(--gold-soft)",color:"var(--gold)",borderColor:"var(--gold)"}}>⚠️ {lang==="fr"?"PRIORITAIRE":"HIGH"}</div>}
                              {workflow && !workflow.priority?.match(/urgent|high/) && <div className="orch-pill">é {workflow.type?.toUpperCase()}</div>}
                            </div>
                            {/* Phase plan */}
                            {wfSteps.length > 0 && (
                              <div style={{padding:"12px 18px 6px"}}>
                                <div style={{display:"flex",gap:6,flexWrap:"wrap" as any}}>
                                  {wfSteps.map((step: any, i: number) => {
                                    const sa = AGENTS_STUDIO.find((a: any) => a.id === step.agentId) || AGENTS_STUDIO[0];
                                    const working = step.status==="working";
                                    const done    = step.status==="done";
                                    const pend    = step.status==="pending";
                                    return (
                                      <div key={i} className={`plan-cell ${working?"busy":done?"done":""}`} style={{position:"relative" as any}}>
                                        <Avatar agent={sa} size={20} status={working?"busy":done?"done":undefined}/>
                                        <span className="plan-cell-name">{sa.name.split(" ")[0]}</span>
                                        <span className="plan-cell-task">
                                          {working?"⌛ é":done?"✅":pend?"⌛ é":""}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {/* Shimmer lines */}
                            {loading && (
                              <div style={{padding:"10px 18px 14px"}}>
                                <div className="shimmer s60"/><div className="shimmer s40"/><div className="shimmer" style={{width:"75%"}}/>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div ref={undefined} style={{height:200}}/>
                    </div>
                  </div>

        {/* Sticky composer — no position:absolute, lives at bottom of flex column */}
        <div className="composer-wrap">
          {msgs.length <= 1 && (
            <div className="quick-prompts">
              {quickPrompts.map((q:string,i:number)=>(
                <button key={i} className="qp" onClick={()=>setInput(q)}>{q}</button>
              ))}
            </div>
          )}
          <div className="composer">
            <textarea
              ref={inputRef}
              className="composer-input"
              placeholder={lang==="fr"?"Posez une question, déposez un document, ou lancez une analyse...":"Ask a question, drop a document, or run an analysis&"}
              value={input}
              onChange={(e:any)=>setInput(e.target.value)}
              rows={1}
              onInput={(e:any) => { e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,140)+"px"; }}
              onKeyDown={(e:any)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            />
            <div className="composer-tools">
                <input ref={fileInputRef} type="file" accept="*" multiple style={{display:"none"}} onChange={handleFileAttach} />
                {attachedFiles.length>0 ? (
              <button className="tool-chip attach" title={attachedFiles.map(f=>f.name).join(", ")} onClick={()=>setAttachedFiles([])}>
                <svg viewBox="0 0 16 16" className="i"><path d="M4 2h6l3 3v9H4z"/><path d="M10 2v3h3"/></svg>
                <span>📎 {attachedFiles.length} fichier{attachedFiles.length>1?"s":""} ×</span>
              </button>
            ) : (
              <button className="tool-chip" title={lang==="fr"?"Joindre des fichiers":"Attach files"} onClick={()=>fileInputRef.current&&fileInputRef.current.click()}>
                    <svg viewBox="0 0 16 16" className="i"><line x1="12" y1="4" x2="4" y2="12"/><path d="M3 9l4 4 6-9"/><path d="M10 2v4h4"/><path d="M4 2h6l4 4v10H4z"/></svg>
                    <span>{lang==="fr"?"Joindre":"Attach"}</span>
                  </button>
                )}
              <button className={`tool-chip ${ragOn?"on":""}`} onClick={()=>setRagOn((v:boolean)=>!v)}>
                <svg viewBox="0 0 16 16" className="i"><path d="M4 2h6l3 3v9H4z"/><path d="M10 2v3h3"/></svg>
                <span>{lang==="fr"?"RAG documents":"RAG documents"}</span>
              </button>
              <button className={`tool-chip ${webOn?"on":""}`} onClick={()=>setWebOn((v:boolean)=>!v)}>
                <svg viewBox="0 0 16 16" className="i"><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12"/></svg>
                <span>{lang==="fr"?"Recherche web":"Web search"}</span>
              </button>
              <button className="send-btn" disabled={loading||routing||!input.trim()} onClick={send}>
                {loading||routing?"&":(lang==="fr"?"Envoyer":"Send")}
                <svg viewBox="0 0 16 16" className="i" style={{width:12,height:12}}><path d="M2 8l12-5-5 12-2-5z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/*  Context panel column  */}
      {showRight && (
        <aside className="context">
                  <div className="ctx-tabs">
                    {(["workflow","sources","cost"] as string[]).map(k => (
                      <div key={k} className={`ctx-tab ${ctxTab===k?"on":""}`} onClick={()=>setCtxTab(k)}>
                        {k==="workflow"?(lang==="fr"?"Workflow":"Workflow"):k==="sources"?(lang==="fr"?"Sources":"Sources"):(lang==="fr"?"Coût":"Cost")}
                        {k==="workflow" && wfSteps.length > 0 && <span className="ct-count">{wfSteps.filter((s:any)=>s.status!=="pending").length}/{wfSteps.length}</span>}
                        {k==="sources" && <span className="ct-count">{convs.length}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="ctx-scroll">
                    {ctxTab==="workflow" && (
                      <div className="ctx-section">
                        <div className="ctx-section-title">
                          {wfSteps.length > 0
                            ? `${wfSteps.filter((s:any)=>s.status==="working").length} ${lang==="fr"?"agents actifs":"agents working"}`
                            : (lang==="fr"?"Aucun workflow actif":"No active workflow")}
                        </div>
                        <div className="timeline">
                          {wfSteps.map((step: any, i: number) => {
                            const sa = AGENTS_STUDIO.find((a:any) => a.id===step.agentId) || AGENTS_STUDIO[0];
                            return (
                              <div key={i} className={`tl-item ${step.status==="working"?"busy":step.status==="done"?"done":"pending"}`}>
                                <div className="tl-name">{sa.name.split(" ")[0]} {sa.name.split(" ").slice(-1)[0][0]}.</div>
                                <div className="tl-task">{agentTitle(step.agentId, lang)}</div>
                                <div className="tl-time">{step.status==="done"?"✅":step.status==="working"?"running&":"queued"}</div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Conversation history */}
                        {convs.length > 0 && (
                          <>
                            <div className="ctx-section-title" style={{marginTop:20}}>{lang==="fr"?"Historique":"History"}</div>
                            {convs.slice(0,8).map((conv: any) => {
                              const sa = AGENTS_STUDIO.find((a:any) => a.id===conv.agentId) || AGENTS_STUDIO[0];
                              return (
                                <div key={conv.id} className="doc-row" onClick={()=>{setActiveId(conv.id);setMsgs(conv.messages||[]);}}
                                  style={{padding:"6px 0",cursor:"pointer"}}>
                                  <Avatar agent={sa} size={20}/>
                                  <div className="doc-meta">
                                    <div className="doc-name" style={{fontSize:11.5}}>{conv.title||"Conversation"}</div>
                                    <div className="doc-info">{fmtTime(conv.updatedAt)}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                    {ctxTab==="sources" && (
                      <div className="ctx-section">
                        <div className="ctx-section-title">{lang==="fr"?"Conversations":"Conversations"}</div>
                        {convs.length === 0 && <div style={{fontSize:11,color:"var(--ink-3)"}}>{lang==="fr"?"Aucune conversation":"No conversations yet"}</div>}
                        {convs.map((conv: any) => {
                          const sa = AGENTS_STUDIO.find((a:any) => a.id===conv.agentId) || AGENTS_STUDIO[0];
                          return (
                            <div key={conv.id} className="doc-row" onClick={()=>{setActiveId(conv.id);setMsgs(conv.messages||[]);}}
                              style={{cursor:"pointer",borderRadius:6,padding:"6px 8px",transition:".1s"}}>
                              <div className="doc-icon" style={{width:28,height:32,fontSize:10.5}}>
                                <Avatar agent={sa} size={22}/>
                              </div>
                              <div className="doc-meta">
                                <div className="doc-name">{conv.title||"Untitled"}</div>
                                <div className="doc-info">{fmtTime(conv.updatedAt)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {ctxTab==="cost" && (
                      <div className="ctx-section">
                        <div className="meter">
                          <div className="meter-row"><span>{lang==="fr"?"Tokens utilisés":"Tokens used"}</span><strong>{msgs.reduce((acc: number, m: any) => acc + (m.content?.length||0), 0).toLocaleString()}</strong></div>
                          <div className="meter-row"><span>{lang==="fr"?"Conversations":"Conversations"}</span><strong>{convs.length}</strong></div>
                          <div className="meter-row"><span>{lang==="fr"?"Agents actifs":"Active agents"}</span><strong>{wfSteps.filter((s:any)=>s.status==="working").length}</strong></div>
                          <div className="meter-bar"><div className="meter-fill" style={{width:Math.min(100, convs.length * 5) + "%"}}/></div>
                          <div className="meter-foot"><span>{lang==="fr"?"session":"session"}</span><span>{lang==="fr"?"OpenRouter":"OpenRouter"}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                </aside>
      )}
    </div>
  );
}

import React from 'react';
import { useOrchestrator } from '../hooks/useOrchestrator';

const AGENTS: Record<string, { emoji: string; label: string; color: string }> = {
  sophie:    { emoji: '💼', label: 'Fiscalité',     color: '#8B5CF6' },
  alexandre: { emoji: '🔍', label: 'Audit',         color: '#F59E0B' },
  natalie:   { emoji: '💰', label: 'Trésorerie',    color: '#10B981' },
  sarah:     { emoji: '📊', label: 'Valorisation',  color: '#3B82F6' },
  marc:      { emoji: '🌱', label: 'ESG',            color: '#34D399' },
  isabelle:  { emoji: '⚖️', label: 'Loi 25',        color: '#6366F1' },
  thomas:    { emoji: '🎯', label: 'Stratégie',     color: '#EF4444' },
  elena:     { emoji: '🌍', label: 'International', color: '#F97316' },
};

const COMPLEXITY_LABELS: Record<string, string> = {
  simple:  '⚡ Analyse simple — 1 expert',
  medium:  '🔄 Analyse croisée — 2-3 experts',
  complex: '🏛️ Due diligence — cabinet complet',
};

interface Props {
  question: string;
  context?: Record<string, unknown>;
  onComplete?: (synthesis: string) => void;
  onClose?: () => void;
}

export const OrchestratorPanel: React.FC<Props> = ({ question, context = {}, onComplete, onClose }) => {
  const { isRunning, complexity, activeAgents, completedAgents, agentResults, synthesis, error, orchestrate, reset } = useOrchestrator();

  const handleStart = async () => {
    await orchestrate(question, context);
    if (synthesis && onComplete) onComplete(synthesis);
  };

  const handleClose = () => {
    reset();
    if (onClose) onClose();
  };

  return (
    <div style={{
      padding: '16px', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px',
      background: 'rgba(139,92,246,0.05)', marginTop: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>🤖 Cabinet Z12 — Analyse Multi-Experts</div>
        {onClose && (
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.6 }}>✕</button>
        )}
      </div>

      {!isRunning && agentResults.length === 0 && (
        <button onClick={handleStart} style={{
          padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
          background: 'rgba(139,92,246,0.8)', color: 'white', fontSize: '13px', fontWeight: 500,
        }}>
          🚀 Lancer l'analyse multi-experts
        </button>
      )}

      {isRunning && (
        <div style={{ fontSize: '13px', color: 'rgba(139,92,246,0.9)', marginBottom: '8px' }}>
          ⟳ Cabinet en délibération...
        </div>
      )}

      {complexity && (
        <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '12px' }}>
          {COMPLEXITY_LABELS[complexity] || complexity}
        </div>
      )}

      {activeAgents.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {activeAgents.map(agent => {
            const av = AGENTS[agent];
            const done = completedAgents.includes(agent);
            return (
              <div key={agent} style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                border: `1.5px solid ${av?.color || '#888'}`,
                opacity: done ? 1 : 0.4,
                background: done ? `${av?.color}15` : 'transparent',
                transition: 'all 0.3s',
              }}>
                {av?.emoji} {av?.label || agent} {done ? ' ✓' : isRunning ? ' ···' : ''}
              </div>
            );
          })}
        </div>
      )}

      {agentResults.map(result => {
        const av = AGENTS[result.agent];
        return (
          <div key={result.agent} style={{
            marginBottom: '10px', padding: '10px 12px',
            borderLeft: `3px solid ${av?.color || '#888'}`,
            background: 'rgba(255,255,255,0.03)', borderRadius: '0 8px 8px 0',
          }}>
            <div style={{ fontWeight: 500, marginBottom: '4px', fontSize: '12px', opacity: 0.8 }}>
              {av?.emoji} {av?.label || result.agent}
            </div>
            <div style={{ fontSize: '12px', whiteSpace: 'pre-wrap', lineHeight: 1.5, opacity: 0.9 }}>
              {result.content}
            </div>
          </div>
        );
      })}

      {synthesis && (
        <div style={{
          marginTop: '14px', padding: '14px',
          background: 'rgba(139,92,246,0.1)', borderRadius: '8px',
          border: '1px solid rgba(139,92,246,0.3)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>🏛️ Synthèse — Cabinet Z12</div>
          <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{synthesis}</div>
        </div>
      )}

      {error && (
        <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '8px' }}>❌ {error}</div>
      )}
    </div>
  );
};

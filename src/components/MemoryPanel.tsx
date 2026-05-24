import React, { useState, useEffect, useCallback } from 'react';

interface Memory {
  id: string;
  tier: 'working' | 'episodic' | 'semantic' | 'procedural';
  agent: string;
  content: string;
  importance: number;
  access_count: number;
  created_at: string | null;
  expires_at: string | null;
}

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const TIER_CONFIG = {
  working:    { label: 'Récente',     color: '#3b82f6', bg: '#1e3a5f', icon: '⚡' },
  episodic:   { label: 'Épisodique',  color: '#8b5cf6', bg: '#2d1b69', icon: '📖' },
  semantic:   { label: 'Sémantique',  color: '#10b981', bg: '#064e3b', icon: '🧠' },
  procedural: { label: 'Procédurale', color: '#f59e0b', bg: '#451a03', icon: '⚙️' },
};

const AGENTS = ['Auto', 'Sophie', 'Alexandre', 'Natalie', 'Isabelle', 'Marc', 'Sarah', 'Jean-François', 'Émilie', 'Patrick'];

export default function MemoryPanel({ isOpen, onClose, authFetch }: MemoryPanelProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [filterTier, setFilterTier] = useState<string>('');
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAgent) params.set('agent', selectedAgent);
      const res = await authFetch(`/api/memory/list?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
        setCount(data.count || 0);
      }
    } catch (e) {
      console.error('[MemoryPanel] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedAgent, authFetch]);

  useEffect(() => {
    if (isOpen) fetchMemories();
  }, [isOpen, fetchMemories]);

  const handleClear = async (agent?: string) => {
    setClearing(true);
    try {
      const params = new URLSearchParams();
      if (agent) params.set('agent', agent);
      const res = await authFetch(`/api/memory/clear?${params.toString()}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchMemories();
        setConfirmClear(null);
      }
    } catch (e) {
      console.error('[MemoryPanel] clear error:', e);
    } finally {
      setClearing(false);
    }
  };

  const filtered = filterTier ? memories.filter(m => m.tier === filterTier) : memories;

  const formatDate = (iso: string | null) => {
    if (!iso) return '∞';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b',
        borderRadius: '16px', width: '90vw', maxWidth: '860px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🧠</span>
            <div>
              <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '18px', fontWeight: 700 }}>
                Mémoire des agents
              </h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                {count} souvenir{count !== 1 ? 's' : ''} actif{count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#64748b',
            fontSize: '24px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px',
          }}>×</button>
        </div>

        {/* Controls */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #1e293b',
          display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}
            style={{
              background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1',
              borderRadius: '8px', padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
            }}>
            <option value="">Tous les agents</option>
            {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
            style={{
              background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1',
              borderRadius: '8px', padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
            }}>
            <option value="">Tous les tiers</option>
            {Object.entries(TIER_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>

          <button onClick={fetchMemories} disabled={loading} style={{
            background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
            borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer',
          }}>
            {loading ? '⟳' : '↺'} Actualiser
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            {confirmClear ? (
              <>
                <span style={{ color: '#fca5a5', fontSize: '13px', alignSelf: 'center' }}>
                  Effacer {confirmClear === 'all' ? 'tout' : confirmClear} ?
                </span>
                <button onClick={() => handleClear(confirmClear === 'all' ? undefined : confirmClear)}
                  disabled={clearing} style={{
                    background: '#7f1d1d', border: '1px solid #dc2626', color: '#fca5a5',
                    borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer',
                  }}>
                  {clearing ? '...' : '✓ Confirmer'}
                </button>
                <button onClick={() => setConfirmClear(null)} style={{
                  background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
                  borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer',
                }}>
                  Annuler
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmClear(selectedAgent || 'all')} style={{
                background: '#1e293b', border: '1px solid #dc2626', color: '#f87171',
                borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer',
              }}>
                🗑️ Effacer {selectedAgent ? selectedAgent : 'tout'}
              </button>
            )}
          </div>
        </div>

        {/* Tier summary */}
        <div style={{
          padding: '12px 24px', borderBottom: '1px solid #1e293b',
          display: 'flex', gap: '8px', flexWrap: 'wrap',
        }}>
          {Object.entries(TIER_CONFIG).map(([tier, cfg]) => {
            const n = memories.filter(m => m.tier === tier).length;
            return (
              <div key={tier} onClick={() => setFilterTier(filterTier === tier ? '' : tier)}
                style={{
                  background: filterTier === tier ? cfg.bg : '#1e293b',
                  border: `1px solid ${filterTier === tier ? cfg.color : '#334155'}`,
                  borderRadius: '20px', padding: '4px 12px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: '14px' }}>{cfg.icon}</span>
                <span style={{ color: cfg.color, fontSize: '12px', fontWeight: 600 }}>{cfg.label}</span>
                <span style={{
                  background: cfg.bg, color: cfg.color,
                  borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700,
                }}>{n}</span>
              </div>
            );
          })}
        </div>

        {/* Memory list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: '40px' }}>
              Chargement...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🧠</div>
              <p style={{ color: '#475569', margin: 0 }}>
                Aucun souvenir {filterTier ? `de tier "${TIER_CONFIG[filterTier as keyof typeof TIER_CONFIG]?.label}"` : ''}.
                <br />Les agents mémoriseront automatiquement vos conversations.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.map(mem => {
                const cfg = TIER_CONFIG[mem.tier] || TIER_CONFIG.working;
                return (
                  <div key={mem.id} style={{
                    background: '#1e293b', border: `1px solid #334155`,
                    borderLeft: `3px solid ${cfg.color}`,
                    borderRadius: '10px', padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px' }}>{cfg.icon}</span>
                      <span style={{
                        background: cfg.bg, color: cfg.color,
                        borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 700,
                      }}>{cfg.label}</span>
                      <span style={{
                        background: '#0f172a', color: '#94a3b8',
                        borderRadius: '12px', padding: '2px 8px', fontSize: '11px',
                      }}>🤖 {mem.agent}</span>
                      <span style={{ color: '#475569', fontSize: '11px', marginLeft: 'auto' }}>
                        Importance: {(mem.importance * 100).toFixed(0)}%
                      </span>
                      <span style={{ color: '#475569', fontSize: '11px' }}>
                        Consulté: {mem.access_count}×
                      </span>
                    </div>
                    <p style={{ margin: '0 0 8px', color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5' }}>
                      {mem.content}
                    </p>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span style={{ color: '#475569', fontSize: '11px' }}>
                        Créé: {formatDate(mem.created_at)}
                      </span>
                      <span style={{ color: '#475569', fontSize: '11px' }}>
                        Expire: {formatDate(mem.expires_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';

interface WhatsAppStatus {
  bridge_running: boolean;
  bridge_connected: boolean;
  whitelist_count: number;
}

interface WhatsAppLog {
  id: number;
  phone: string;
  message: string;
  type: string;
  time: string;
}

interface WhatsAppPanelProps {
  open: boolean;
  onClose: () => void;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}

export default function WhatsAppPanel({ open, onClose, authFetch }: WhatsAppPanelProps) {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState({
    tresorerie_critique: true,
    rappel_fiscal: true,
    rag_termine: true,
    anomalie: false,
  });
  const [logs] = useState<WhatsAppLog[]>([]);
  const [newNumber, setNewNumber] = useState('');
  const [whitelist, setWhitelist] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchStatus();
    const stored = localStorage.getItem('z12_whatsapp_whitelist');
    if (stored) setWhitelist(JSON.parse(stored));
    const storedAlerts = localStorage.getItem('z12_whatsapp_alerts');
    if (storedAlerts) setAlerts(JSON.parse(storedAlerts));
  }, [open]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const resp = await authFetch('/api/whatsapp/status');
      if (resp.ok) {
        const data = await resp.json();
        setStatus(data);
      }
    } catch {
      setStatus({ bridge_running: false, bridge_connected: false, whitelist_count: 0 });
    } finally {
      setLoading(false);
    }
  };

  const saveAlerts = (newAlerts: typeof alerts) => {
    setAlerts(newAlerts);
    localStorage.setItem('z12_whatsapp_alerts', JSON.stringify(newAlerts));
  };

  const addNumber = () => {
    const cleaned = newNumber.replace(/\D/g, '');
    if (!cleaned || whitelist.includes(cleaned)) return;
    const updated = [...whitelist, cleaned];
    setWhitelist(updated);
    localStorage.setItem('z12_whatsapp_whitelist', JSON.stringify(updated));
    setNewNumber('');
  };

  const removeNumber = (n: string) => {
    const updated = whitelist.filter(x => x !== n);
    setWhitelist(updated);
    localStorage.setItem('z12_whatsapp_whitelist', JSON.stringify(updated));
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1a1a2e', border: '1px solid #25d366', borderRadius: 16,
        width: 560, maxHeight: '88vh', overflowY: 'auto', padding: 28,
        fontFamily: 'Inter, sans-serif', color: '#e0e0e0',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 28 }}>📱</span>
          <div>
            <h2 style={{ margin: 0, color: '#25d366', fontSize: 20 }}>WhatsApp Z12</h2>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
              Canal direct avec vos agents CPA
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: '#aaa', fontSize: 22, cursor: 'pointer',
            }}
          >x</button>
        </div>

        {/* Status */}
        <div style={{
          background: '#0d1117', borderRadius: 10, padding: '14px 18px',
          marginBottom: 20, display: 'flex', gap: 24, alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>BRIDGE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: status?.bridge_running ? '#25d366' : '#e74c3c',
                display: 'inline-block',
              }}/>
              <span style={{ fontSize: 13 }}>
                {loading ? 'Chargement...' : status?.bridge_running ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>CONNEXION WA</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: status?.bridge_connected ? '#25d366' : '#f39c12',
                display: 'inline-block',
              }}/>
              <span style={{ fontSize: 13 }}>
                {status?.bridge_connected ? 'Connecte' : 'En attente QR'}
              </span>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            style={{
              marginLeft: 'auto', background: '#1e3a5f', border: '1px solid #25d366',
              color: '#25d366', borderRadius: 6, padding: '5px 12px',
              cursor: 'pointer', fontSize: 12,
            }}
          >
            Actualiser
          </button>
        </div>

        {/* Bridge offline note */}
        {!status?.bridge_running && (
          <div style={{
            background: '#1a1200', border: '1px solid #f39c12', borderRadius: 8,
            padding: '12px 16px', marginBottom: 20, fontSize: 13,
          }}>
            <strong style={{ color: '#f39c12' }}>Bridge non demarre</strong>
            <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: 12 }}>
              Lancez le bridge sur le VPS avec un numero dedie:
              <br/><code style={{ color: '#25d366' }}>cd /opt/whatsapp-bridge && node index.js</code>
              <br/>Puis scannez le QR code avec WhatsApp.
            </p>
            <p style={{ margin: '6px 0 0', opacity: 0.7, fontSize: 11 }}>
              Numero dedie requis (SIM virtuelle ~5$/mois — Twilio ou SIM prepayee)
            </p>
          </div>
        )}

        {/* Whitelist */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: '#25d366', fontSize: 14, margin: '0 0 10px' }}>
            Numeros autorises ({whitelist.length})
          </h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={newNumber}
              onChange={e => setNewNumber(e.target.value)}
              placeholder="Ex: 15141234567 (sans +)"
              style={{
                flex: 1, background: '#0d1117', border: '1px solid #333',
                borderRadius: 6, padding: '7px 12px', color: '#e0e0e0',
                fontSize: 13,
              }}
              onKeyDown={e => { if (e.key === 'Enter') addNumber(); }}
            />
            <button
              onClick={addNumber}
              style={{
                background: '#25d366', border: 'none', borderRadius: 6,
                color: '#000', fontWeight: 600, padding: '7px 14px',
                cursor: 'pointer', fontSize: 13,
              }}
            >
              Ajouter
            </button>
          </div>
          {whitelist.length === 0 ? (
            <p style={{ opacity: 0.5, fontSize: 12, margin: 0 }}>
              Aucun numero whiteliste. Ajoutez votre numero dedie ci-dessus.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {whitelist.map(n => (
                <div key={n} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#0d1117', borderRadius: 6, padding: '6px 12px',
                }}>
                  <span style={{ fontSize: 13 }}>+{n}</span>
                  <button
                    onClick={() => removeNumber(n)}
                    style={{
                      background: 'none', border: 'none', color: '#e74c3c',
                      cursor: 'pointer', fontSize: 16,
                    }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertes proactives */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: '#25d366', fontSize: 14, margin: '0 0 10px' }}>
            Alertes proactives
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { key: 'tresorerie_critique', label: 'Tresorerie critique', icon: '⚠️' },
              { key: 'rappel_fiscal', label: 'Rappels fiscaux', icon: '📅' },
              { key: 'rag_termine', label: 'Indexation terminee', icon: '✅' },
              { key: 'anomalie', label: 'Anomalies detectees', icon: '🔍' },
            ].map(({ key, label, icon }) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#0d1117', borderRadius: 6, padding: '8px 12px',
              }}>
                <span style={{ fontSize: 13 }}>{icon} {label}</span>
                <button
                  onClick={() => saveAlerts({ ...alerts, [key]: !alerts[key as keyof typeof alerts] })}
                  style={{
                    background: alerts[key as keyof typeof alerts] ? '#25d366' : '#333',
                    border: 'none', borderRadius: 12, width: 44, height: 24,
                    cursor: 'pointer', transition: 'background 0.2s',
                    position: 'relative',
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    left: alerts[key as keyof typeof alerts] ? 22 : 4,
                    top: 4, width: 16, height: 16, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                  }}/>
                </button>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, opacity: 0.5, margin: '8px 0 0' }}>
            Loi 25 : Seuls des resumes et alertes sont envoyes par WhatsApp. Aucune donnee financiere brute.
          </p>
        </div>

        {/* Log messages */}
        <div>
          <h3 style={{ color: '#25d366', fontSize: 14, margin: '0 0 10px' }}>
            Dernieres activites
          </h3>
          {logs.length === 0 ? (
            <p style={{ opacity: 0.5, fontSize: 12, margin: 0 }}>
              Aucune activite recente. Les messages apparaitront ici apres connexion.
            </p>
          ) : (
            logs.map(log => (
              <div key={log.id} style={{
                background: '#0d1117', borderRadius: 6, padding: '8px 12px', marginBottom: 6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, color: '#25d366' }}>+{log.phone}</span>
                  <span style={{ fontSize: 11, opacity: 0.5 }}>{log.time}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>{log.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 20, paddingTop: 16, borderTop: '1px solid #222',
          fontSize: 11, opacity: 0.5, textAlign: 'center',
        }}>
          Bridge: whatsapp-web.js | Reconnexion auto si deconnexion {'>'} 5 min
        </div>
      </div>
    </div>
  );
}

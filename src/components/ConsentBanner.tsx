import React, { useState, useEffect } from 'react';

const CONSENT_KEY = 'z12_cfo_consent_v1';

interface ConsentBannerProps {
  onConsent: () => void;
  onShowPolicy: () => void;
}

export default function ConsentBanner({ onConsent, onShowPolicy }: ConsentBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      accepted: true,
      date: new Date().toISOString(),
      version: '1.0',
    }));
    setVisible(false);
    onConsent();
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderTop: '1px solid #334155',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
      padding: '20px 24px',
    }}>
      <div style={{
        maxWidth: '1100px', margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
      }}>
        {/* Icône */}
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          borderRadius: '12px', padding: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '22px' }}>🔒</span>
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: '280px' }}>
          <p style={{ margin: '0 0 4px', color: '#f1f5f9', fontSize: '14px', fontWeight: 600 }}>
            Confidentialité &amp; Loi 25 — Votre consentement
          </p>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>
            Z12 AI CFO Suite collecte et traite vos données financières sur un serveur sécurisé
            au Canada (Montréal). Vos données ne sont jamais revendues. Les conversations sont
            analysées par OpenRouter (IA) pour vous fournir le service.{' '}
            <button
              onClick={onShowPolicy}
              style={{
                background: 'none', border: 'none', color: '#60a5fa',
                cursor: 'pointer', textDecoration: 'underline', fontSize: '12px', padding: 0,
              }}
            >
              Lire la politique complète →
            </button>
          </p>
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={onShowPolicy}
            style={{
              background: 'none', border: '1px solid #475569', color: '#94a3b8',
              borderRadius: '8px', padding: '9px 16px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, transition: 'all 0.15s',
            }}
          >
            En savoir plus
          </button>
          <button
            onClick={handleAccept}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none', color: '#fff',
              borderRadius: '8px', padding: '9px 20px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
              boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
            }}
          >
            ✓ J'accepte et je continue
          </button>
        </div>
      </div>
    </div>
  );
}

/** Utilitaire : vérifier si le consentement a été donné */
export function hasConsent(): boolean {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored);
    return data.accepted === true;
  } catch {
    return false;
  }
}

/** Utilitaire : révoquer le consentement */
export function revokeConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
}

import React, { useState } from 'react';

interface WelcomeBannerProps {
  openrouterKey?: string;
  onGoToSettings?: () => void;
}

export function WelcomeBanner({ openrouterKey, onGoToSettings }: WelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Show only if no key configured and not dismissed
  const hasKey = Boolean(openrouterKey && openrouterKey.trim().length > 0);
  if (hasKey || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '60px',
        right: '16px',
        zIndex: 1000,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '1px solid rgba(139,92,246,0.5)',
        borderRadius: '12px',
        padding: '20px 24px',
        maxWidth: '340px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        color: '#e2e8f0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🎯</span>
          <span style={{ fontWeight: 700, fontSize: '15px', color: '#a78bfa' }}>
            Bienvenue dans Z12 CFO
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 0 0 8px',
            lineHeight: 1,
          }}
          title="Fermer"
        >
          ✕
        </button>
      </div>

      <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
        Pour utiliser les agents CPA, 2 étapes rapides :
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: 'rgba(139,92,246,0.12)',
            borderRadius: '8px',
            padding: '10px 12px',
            border: '1px solid rgba(139,92,246,0.25)',
          }}
        >
          <span style={{
            background: '#7c3aed',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            minWidth: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
          }}>1</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#c4b5fd', marginBottom: '2px' }}>
              Configurer votre clé OpenRouter
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Allez dans <strong style={{ color: '#a78bfa' }}>Paramètres</strong> (icône ⚙️ en bas à gauche) → saisissez votre clé → Tester connexion
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: 'rgba(16,185,129,0.08)',
            borderRadius: '8px',
            padding: '10px 12px',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          <span style={{
            background: '#059669',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            minWidth: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
          }}>2</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#6ee7b7', marginBottom: '2px' }}>
              Poser votre première question à Patrick
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Sélectionnez <strong style={{ color: '#6ee7b7' }}>Patrick</strong> dans la liste des agents → posez votre question sur les subventions PME
            </div>
          </div>
        </div>
      </div>

      {onGoToSettings && (
        <button
          onClick={() => { onGoToSettings(); setDismissed(true); }}
          style={{
            marginTop: '14px',
            width: '100%',
            background: 'linear-gradient(90deg, #7c3aed, #5b21b6)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Aller aux Paramètres →
        </button>
      )}
    </div>
  );
}

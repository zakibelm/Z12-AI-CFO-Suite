import React from 'react';

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: '28px' }}>
    <h3 style={{ color: '#60a5fa', fontSize: '15px', fontWeight: 700, margin: '0 0 10px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
      {title}
    </h3>
    <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.7' }}>{children}</div>
  </div>
);

export default function PrivacyPolicy({ isOpen, onClose, onAccept }: PrivacyPolicyProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b',
        borderRadius: '16px', width: '90vw', maxWidth: '780px',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '16px 16px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🔒</span>
            <div>
              <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '17px', fontWeight: 700 }}>
                Politique de confidentialité
              </h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>
                Z12 AI CFO Suite — Conforme Loi 25 (Québec) — Version 1.0 — 23 mai 2026
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '24px', cursor: 'pointer', padding: '4px 8px' }}>×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          <Section title="1. Responsable du traitement">
            <p>
              <strong style={{ color: '#f1f5f9' }}>Z12 AI CFO Suite</strong> — exploité par Zaki Belm,
              entrepreneur individuel, Québec (Canada).
              Contact : <span style={{ color: '#60a5fa' }}>privacy@optigenius.pro</span>
            </p>
            <p>
              Conformément à la <strong style={{ color: '#f1f5f9' }}>Loi 25</strong> (Loi modernisant des
              dispositions législatives en matière de protection des renseignements personnels, L.R.Q.
              c. P-39.1 modifiée), nous nous engageons à protéger vos renseignements personnels.
            </p>
          </Section>

          <Section title="2. Données collectées">
            <p><strong style={{ color: '#e2e8f0' }}>Données d'identification :</strong></p>
            <ul style={{ paddingLeft: '20px', margin: '6px 0 14px' }}>
              <li>Adresse courriel (authentification)</li>
              <li>Identifiant unique de session (JWT, durée 7 jours)</li>
            </ul>
            <p><strong style={{ color: '#e2e8f0' }}>Données d'utilisation :</strong></p>
            <ul style={{ paddingLeft: '20px', margin: '6px 0 14px' }}>
              <li>Conversations avec les agents IA (questions et réponses)</li>
              <li>Documents financiers uploadés pour analyse (PDF, Excel, images)</li>
              <li>Mémoire contextuelle des sessions (résumés anonymisés, conservation 30 jours max pour tier épisodique)</li>
              <li>Journaux d'erreurs techniques (via Sentry — anonymisés)</li>
            </ul>
            <p><strong style={{ color: '#e2e8f0' }}>Données NON collectées :</strong></p>
            <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
              <li>Numéros de compte bancaire ou de carte de crédit</li>
              <li>Numéros d'assurance sociale ou d'identité gouvernementale</li>
              <li>Données biométriques</li>
            </ul>
          </Section>

          <Section title="3. Finalités du traitement">
            <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
              <li>Fournir le service d'analyse financière par IA</li>
              <li>Authentifier et sécuriser l'accès à votre compte</li>
              <li>Mémoriser le contexte pour améliorer la pertinence des réponses</li>
              <li>Détecter et corriger les erreurs techniques</li>
              <li>Respecter les obligations légales applicables</li>
            </ul>
          </Section>

          <Section title="4. Sous-traitants et transferts">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#1e293b' }}>
                  {['Sous-traitant', 'Rôle', 'Résidence des données', 'Politique'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Hostinger VPS', 'Hébergement serveur', 'Canada (Montréal) CA-QC', 'hostinger.com/privacy'],
                  ['OpenRouter', 'Routage requêtes IA (clé serveur uniquement)', 'États-Unis', 'openrouter.ai/privacy'],
                  ['Sentry.io', 'Journaux d\'erreurs JS anonymisés', 'États-Unis', 'sentry.io/privacy'],
                  ['UptimeRobot', 'Surveillance disponibilité (URL uniquement)', 'États-Unis', 'uptimerobot.com/privacy'],
                ].map(([st, role, loc, pol], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '8px 10px', color: '#e2e8f0', fontWeight: 600 }}>{st}</td>
                    <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{role}</td>
                    <td style={{ padding: '8px 10px', color: loc.includes('Canada') ? '#4ade80' : '#fbbf24' }}>{loc}</td>
                    <td style={{ padding: '8px 10px', color: '#60a5fa', fontSize: '11px' }}>{pol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: '12px', color: '#94a3b8', fontSize: '12px' }}>
              ⚠️ Les sous-traitants américains (OpenRouter, Sentry, UptimeRobot) sont soumis à des
              garanties contractuelles conformes à la Loi 25 (art. 17). Aucune donnée d'identification
              nominative n'est transmise à Sentry ou UptimeRobot.
            </p>
          </Section>

          <Section title="5. Conservation des données">
            <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
              <li><strong style={{ color: '#e2e8f0' }}>Sessions de conversation :</strong> 24 heures (mémoire working)</li>
              <li><strong style={{ color: '#e2e8f0' }}>Historique épisodique :</strong> 30 jours</li>
              <li><strong style={{ color: '#e2e8f0' }}>Connaissances sémantiques :</strong> Durée du compte actif</li>
              <li><strong style={{ color: '#e2e8f0' }}>Documents uploadés :</strong> Durée du compte (supprimables à tout moment)</li>
              <li><strong style={{ color: '#e2e8f0' }}>Compte utilisateur :</strong> Jusqu'à suppression explicite ou 2 ans d'inactivité</li>
              <li><strong style={{ color: '#e2e8f0' }}>Journaux Sentry :</strong> 30 jours (anonymisés)</li>
            </ul>
          </Section>

          <Section title="6. Vos droits (Loi 25 — art. 27-37)">
            <p>Vous disposez des droits suivants sur vos données personnelles :</p>
            <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
              <li><strong style={{ color: '#4ade80' }}>Droit d'accès</strong> — Obtenir une copie de toutes vos données</li>
              <li><strong style={{ color: '#4ade80' }}>Droit de rectification</strong> — Corriger des informations inexactes</li>
              <li><strong style={{ color: '#f87171' }}>Droit à l'effacement</strong> — Supprimer votre compte et toutes vos données</li>
              <li><strong style={{ color: '#60a5fa' }}>Droit à la portabilité</strong> — Recevoir vos données dans un format structuré</li>
              <li><strong style={{ color: '#fbbf24' }}>Droit d'opposition</strong> — Retirer votre consentement à tout moment</li>
              <li><strong style={{ color: '#a78bfa' }}>Droit à l'information</strong> — Être informé de tout incident de sécurité vous concernant</li>
            </ul>
            <p style={{ marginTop: '10px' }}>
              Pour exercer ces droits, contactez-nous : <span style={{ color: '#60a5fa' }}>privacy@optigenius.pro</span>
              <br />Délai de réponse : <strong style={{ color: '#e2e8f0' }}>30 jours maximum</strong> conformément à la Loi 25.
            </p>
          </Section>

          <Section title="7. Sécurité des données">
            <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
              <li>Chiffrement HTTPS/TLS 1.3 en transit</li>
              <li>Base de données PostgreSQL dans un conteneur Docker isolé</li>
              <li>Authentification JWT avec expiration automatique (7 jours)</li>
              <li>Clés API serveur uniquement — jamais exposées au navigateur</li>
              <li>Sauvegardes chiffrées quotidiennes avec rétention 30 jours</li>
              <li>Surveillance de disponibilité et d'erreurs en temps réel</li>
            </ul>
          </Section>

          <Section title="8. Incidents de sécurité">
            <p>
              En cas d'incident affectant vos données personnelles, vous serez notifié dans un délai
              de <strong style={{ color: '#f1f5f9' }}>72 heures</strong> conformément à la Loi 25
              (art. 3.5) et à la Commission d'accès à l'information du Québec (CAI).
            </p>
          </Section>

          <Section title="9. Consentement et modifications">
            <p>
              En utilisant Z12 AI CFO Suite, vous consentez à la présente politique. Toute modification
              matérielle sera signalée par une nouvelle bannière de consentement. La date de dernière
              mise à jour figure en haut de ce document.
            </p>
            <p>
              Autorité de régulation : <strong style={{ color: '#e2e8f0' }}>Commission d'accès à l'information du Québec (CAI)</strong>
              <br /><span style={{ color: '#60a5fa' }}>cai.gouv.qc.ca</span> — 1 888 528-7741
            </p>
          </Section>

        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid #1e293b',
          display: 'flex', gap: '12px', justifyContent: 'flex-end',
          background: '#0f172a', borderRadius: '0 0 16px 16px',
        }}>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #334155', color: '#94a3b8',
            borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', fontSize: '13px',
          }}>
            Fermer
          </button>
          {onAccept && (
            <button onClick={() => { onAccept(); onClose(); }} style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none', color: '#fff',
              borderRadius: '8px', padding: '9px 20px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600,
              boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
            }}>
              ✓ J'accepte cette politique
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

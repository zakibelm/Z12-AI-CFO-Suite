# Registre des traitements — Z12 AI CFO Suite
**Conforme Loi 25 (Québec) — Mis à jour : 23 mai 2026**

Responsable : Zaki Belm — privacy@optigenius.pro

---

## Traitement 1 — Authentification utilisateur
| Champ | Valeur |
|---|---|
| Finalité | Identification et sécurisation de l'accès |
| Base légale | Consentement (art. 4 Loi 25) |
| Données | Adresse courriel, hash du mot de passe (bcrypt), JWT |
| Conservation | Compte actif + 2 ans d'inactivité |
| Destinataires | Hostinger VPS (Canada) uniquement |
| Transfert hors QC | Non |

## Traitement 2 — Conversations avec les agents IA
| Champ | Valeur |
|---|---|
| Finalité | Fourniture du service d'analyse financière |
| Base légale | Exécution du contrat de service |
| Données | Questions utilisateur, réponses IA, contexte de session |
| Conservation | 24h (working), 30 jours (épisodique), permanent (sémantique) |
| Destinataires | OpenRouter (É.-U.) — clé API serveur uniquement, contenu des messages |
| Transfert hors QC | Oui — OpenRouter (É.-U.) avec garanties contractuelles |
| Mesures de protection | Chiffrement TLS, pas de données bancaires transmises |

## Traitement 3 — Documents financiers (RAG)
| Champ | Valeur |
|---|---|
| Finalité | Analyse documentaire augmentée par IA |
| Base légale | Consentement explicite lors de l'upload |
| Données | Contenu des PDF/Excel/images uploadés, vecteurs d'embedding |
| Conservation | Durée du compte (suppression à la demande) |
| Destinataires | Hostinger VPS (Canada) — pgvector |
| Transfert hors QC | Partiel — OpenRouter reçoit extraits texte pour embedding |

## Traitement 4 — Journaux d'erreurs (Sentry)
| Champ | Valeur |
|---|---|
| Finalité | Débogage et amélioration du service |
| Base légale | Intérêt légitime (sécurité du service) |
| Données | Stack traces JS anonymisés, navigateur, OS, URL |
| Conservation | 30 jours |
| Destinataires | Sentry.io (É.-U.) |
| Données nominatives transmises | Non — anonymisation automatique |
| Transfert hors QC | Oui — Sentry (É.-U.) avec garanties RGPD/Loi 25 |

## Traitement 5 — Surveillance de disponibilité (UptimeRobot)
| Champ | Valeur |
|---|---|
| Finalité | Monitoring disponibilité du service |
| Base légale | Intérêt légitime (continuité de service) |
| Données | URL de l'application uniquement |
| Conservation | 90 jours |
| Destinataires | UptimeRobot (É.-U.) |
| Données personnelles transmises | Aucune |

---


## Traitement 6 — WhatsApp / Canal de messagerie (Twilio)
| Champ | Valeur |
|---|---|
| Finalité | Permettre aux utilisateurs d’interagir avec Z12 CFO via WhatsApp |
| Base légale | Consentement explicite (l’utilisateur initie le contact) |
| Données | Numéro de téléphone WhatsApp, contenu des messages, métadonnées Twilio |
| Conservation | 90 jours (logs backend) — Twilio conserve 7 jours |
| Destinataires | Twilio Inc. (É.-U.) via API sécurisée HTTPS |
| Données nominatives transmises | Oui — numéro de téléphone (identifiant) |
| Transfert hors QC | Oui — Twilio (É.-U.) avec DPA + clauses contractuelles |
| Mesures de protection | HTTPS/TLS, webhook signé (X-Twilio-Signature), liste blanche numéros |
| Données financières | NON — seuls résumés et alertes envoyés (art. R8) |
| Droit de retrait | Cesser de contacter le numéro Twilio ou contacter privacy@optigenius.pro |

## Audit de résidence des données — Résumé

| Sous-traitant | Résidence | Données personnelles | Garanties |
|---|---|---|---|
| Hostinger VPS | 🇨🇦 Canada (Montréal) | Oui | Contrat hébergement |
| OpenRouter | 🇺🇸 États-Unis | Oui (contenu messages) | CGU + DPA disponible |
| Sentry.io | 🇺🇸 États-Unis | Non (anonymisé) | Privacy Shield / DPA |
| UptimeRobot | 🇺🇸 États-Unis | Non | URL uniquement |
| Twilio Inc. | 🇺🇸 États-Unis | Oui (n° tél, messages) | DPA + clauses contractuelles |

**Note Loi 25 (art. 17)** : Les transferts vers OpenRouter sont encadrés par des clauses contractuelles
standard. L'utilisateur est informé de ce transfert dans la politique de confidentialité.

---

## Droits des personnes concernées

- **Accès** : GET /api/privacy/my-data (authentifié)
- **Effacement** : DELETE /api/privacy/delete-my-account (authentifié)
- **Contact** : privacy@optigenius.pro
- **Autorité** : Commission d'accès à l'information du Québec (CAI) — cai.gouv.qc.ca

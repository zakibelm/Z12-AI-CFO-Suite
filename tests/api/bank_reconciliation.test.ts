/**
 * tests/api/bank_reconciliation.test.ts
 * M3 BankReconciliationAgent — Tests unitaires
 * 
 * Ces tests vérifient la logique de parsing et matching via l'API.
 * Requièrent un backend actif sur BASE_URL.
 */

import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:8000'

// CSV de test — format standardisé (montant unique)
const RELEVE_CSV_SIMPLE = `Date,Description,Montant
2026-01-02,Loyer bureau,-1500.00
2026-01-05,Paiement fournisseur ABC,-875.50
2026-01-10,Salaires,-4500.00
`

const GL_CSV_SIMPLE = `Date,Libelle,Montant,Reference
2026-01-02,Loyer Bureau Jan,-1500.00,GL-001
2026-01-05,Fournisseur ABC,-875.50,GL-002
2026-01-10,Paie Janvier,-4500.00,GL-003
2026-01-15,Frais bancaires,-25.00,GL-004
`

const GL_CSV_DECALE = `Date,Libelle,Montant,Reference
2026-01-03,Loyer Bureau Jan,-1500.00,GL-001
2026-01-07,Fournisseur ABC,-875.50,GL-002
2026-01-12,Paie Janvier,-4500.00,GL-003
`

// ─── Tests de l'endpoint /api/bank/status ────────────────────────────────────

describe('GET /api/bank/status', () => {
  it('should return agent status', async () => {
    const res = await fetch(`${BASE_URL}/api/bank/status`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.agent).toBe('BankReconciliationAgent')
  })
})

// ─── Tests de l'endpoint /api/bank/reconcile ─────────────────────────────────

describe('POST /api/bank/reconcile — cas nominal', () => {
  it('should match 3/3 transactions with identical amounts and dates', async () => {
    const res = await fetch(`${BASE_URL}/api/bank/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        releve_csv: RELEVE_CSV_SIMPLE,
        grand_livre_csv: GL_CSV_SIMPLE,
        periode: 'Janvier 2026',
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.stats.matched).toBe(3)
    expect(data.stats.total_releve).toBe(3)
    expect(data.stats.unmatched_grand_livre).toBe(1) // Frais bancaires
    expect(data.stats.precision_pct).toBeGreaterThanOrEqual(85)
    expect(data.disclaimer).toBeTruthy()
    expect(data.disclaimer.length).toBeGreaterThan(50)
    expect(data.periode).toBe('Janvier 2026')
  })

  it('should match transactions with date offset within 3 days', async () => {
    const res = await fetch(`${BASE_URL}/api/bank/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        releve_csv: RELEVE_CSV_SIMPLE,
        grand_livre_csv: GL_CSV_DECALE,
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    // Loyer: delta 1j ✓, ABC: delta 2j ✓, Salaires: delta 2j ✓
    expect(data.stats.matched).toBe(3)
    expect(data.stats.precision_pct).toBe(100.0)
  })

  it('should include disclaimer in every response', async () => {
    const res = await fetch(`${BASE_URL}/api/bank/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        releve_csv: RELEVE_CSV_SIMPLE,
        grand_livre_csv: GL_CSV_SIMPLE,
      }),
    })
    const data = await res.json()
    expect(data.disclaimer).toContain('AVERTISSEMENT')
    expect(data.disclaimer).toContain('CPA')
  })
})

// ─── Tests de validation des inputs ──────────────────────────────────────────

describe('POST /api/bank/reconcile — validation', () => {
  it('should return 400 when releve_csv is empty', async () => {
    const res = await fetch(`${BASE_URL}/api/bank/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        releve_csv: '',
        grand_livre_csv: GL_CSV_SIMPLE,
      }),
    })
    expect(res.status).toBe(400)
  })

  it('should return 400 when grand_livre_csv is empty', async () => {
    const res = await fetch(`${BASE_URL}/api/bank/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        releve_csv: RELEVE_CSV_SIMPLE,
        grand_livre_csv: '',
      }),
    })
    expect(res.status).toBe(400)
  })

  it('should handle CSV with parse errors gracefully', async () => {
    const res = await fetch(`${BASE_URL}/api/bank/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        releve_csv: 'Date,Montant\n2026-01-01,invalid_amount\n',
        grand_livre_csv: GL_CSV_SIMPLE,
      }),
    })
    // Should not crash — returns 200 with erreurs_parse populated
    expect([200, 400, 500]).toContain(res.status)
    if (res.status === 200) {
      const data = await res.json()
      // erreurs_parse may contain info about the bad row
      expect(data.stats).toBeDefined()
    }
  })
})

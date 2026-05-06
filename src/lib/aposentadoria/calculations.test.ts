import { describe, it, expect } from 'vitest'
import {
  monthlyRate,
  capitalPerpetuidade,
  capitalAnnuity,
  calcPMT,
  buildSimulation,
} from './calculations'
import type { ScenarioResult } from './types'

describe('monthlyRate', () => {
  it('converts 6% a.a. to monthly', () => {
    expect(monthlyRate(6)).toBeCloseTo(0.004868, 5)
  })
  it('returns 0 for 0% a.a.', () => {
    expect(monthlyRate(0)).toBe(0)
  })
})

describe('capitalPerpetuidade', () => {
  it('returns null when r_ret is 0', () => {
    expect(capitalPerpetuidade(10000, 0)).toBeNull()
  })
  it('calculates C = renda / r for r > 0', () => {
    const r = monthlyRate(4)
    expect(capitalPerpetuidade(10000, r)).toBeCloseTo(10000 / r, 0)
  })
})

describe('capitalAnnuity', () => {
  it('uses renda * n when r = 0', () => {
    expect(capitalAnnuity(10000, 0, 360)).toBeCloseTo(3_600_000, 0)
  })
  it('calculates PV of annuity for r > 0', () => {
    const r = monthlyRate(4)
    const n = 300
    const expected = 10000 * ((1 - Math.pow(1 + r, -n)) / r)
    expect(capitalAnnuity(10000, r, n)).toBeCloseTo(expected, 0)
  })
})

describe('calcPMT', () => {
  it('returns 0 and metaJaAtingida=true when patrimonio already covers capital', () => {
    const result = calcPMT(1_000_000, 1_500_000, monthlyRate(6), 240)
    expect(result.metaJaAtingida).toBe(true)
    expect(result.aporteMensal).toBe(0)
  })
  it('calculates correct PMT for r_ac > 0', () => {
    const r = monthlyRate(6)
    const n = 360
    const capital = 3_000_000
    const patrimonio = 0
    const { aporteMensal } = calcPMT(capital, patrimonio, r, n)
    // Verify: PMT * FV_annuity = capital
    const fvAnnuity = (Math.pow(1 + r, n) - 1) / r
    expect(aporteMensal * fvAnnuity).toBeCloseTo(capital, -2)
  })
  it('calculates PMT = capital / n when r_ac = 0', () => {
    const { aporteMensal } = calcPMT(3_000_000, 0, 0, 360)
    expect(aporteMensal).toBeCloseTo(3_000_000 / 360, 2)
  })
})

describe('buildSimulation', () => {
  it('first point has patrimonio = patrimonioAtual for all scenarios', () => {
    const pts = buildSimulation(
      { aporteMensal: 1000, metaJaAtingida: false, capitalNecessario: 1_000_000, nome: 'A' },
      { aporteMensal: 800,  metaJaAtingida: false, capitalNecessario: 800_000,   nome: 'B' },
      { aporteMensal: 900,  metaJaAtingida: false, capitalNecessario: 900_000,   nome: 'C' },
      { rendaMensal: 10000, idadeAtual: 30, idadeAposentadoria: 60, patrimonioAtual: 50000,
        rentabilidadeAcumulacao: 6, rentabilidadeRetirada: 4, expectativaVida: 85 },
      false
    )
    expect(pts[0].idade).toBe(30)
    expect(pts[0].cenarioB).toBe(50000)
    expect(pts[0].cenarioC).toBe(50000)
    expect(pts[0].cenarioA).toBe(50000)
  })
  it('sets cenarioA null throughout when cenarioAUndefined = true', () => {
    const pts = buildSimulation(
      { aporteMensal: 0, metaJaAtingida: false, capitalNecessario: 0, nome: 'A' },
      { aporteMensal: 800, metaJaAtingida: false, capitalNecessario: 800_000, nome: 'B' },
      { aporteMensal: 900, metaJaAtingida: false, capitalNecessario: 900_000, nome: 'C' },
      { rendaMensal: 10000, idadeAtual: 30, idadeAposentadoria: 60, patrimonioAtual: 0,
        rentabilidadeAcumulacao: 6, rentabilidadeRetirada: 0, expectativaVida: 85 },
      true
    )
    expect(pts.every(p => p.cenarioA === null)).toBe(true)
  })
  it('patrimonio never goes below 0 in withdrawal phase', () => {
    const pts = buildSimulation(
      { aporteMensal: 0, metaJaAtingida: false, capitalNecessario: 100_000, nome: 'A' },
      { aporteMensal: 0, metaJaAtingida: false, capitalNecessario: 100_000, nome: 'B' },
      { aporteMensal: 0, metaJaAtingida: false, capitalNecessario: 100_000, nome: 'C' },
      { rendaMensal: 50000, idadeAtual: 60, idadeAposentadoria: 60, patrimonioAtual: 100_000,
        rentabilidadeAcumulacao: 6, rentabilidadeRetirada: 4, expectativaVida: 85 },
      false
    )
    expect(pts.every(p => p.cenarioB >= 0)).toBe(true)
  })
})

describe('edge cases', () => {
  it('capitalAnnuity: renda=0 always returns 0', () => {
    expect(capitalAnnuity(0, monthlyRate(6), 300)).toBe(0)
    expect(capitalAnnuity(0, 0, 300)).toBe(0)
  })

  it('calcPMT: r_ac=0 with non-zero patrimonio returns (capital - patrimonio) / n', () => {
    const { aporteMensal, metaJaAtingida } = calcPMT(1_200_000, 200_000, 0, 360)
    expect(metaJaAtingida).toBe(false)
    expect(aporteMensal).toBeCloseTo((1_200_000 - 200_000) / 360, 2)
  })

  it('calcPMT: negative gap (FV_patrimonio > capital) returns metaJaAtingida=true', () => {
    const result = calcPMT(500_000, 2_000_000, monthlyRate(6), 240)
    expect(result.metaJaAtingida).toBe(true)
    expect(result.aporteMensal).toBe(0)
  })

  it('buildSimulation: patrimonio never goes negative in withdrawal phase', () => {
    const tiny: ScenarioResult = { nome: '', capitalNecessario: 1000, aporteMensal: 0, metaJaAtingida: false }
    const pts = buildSimulation(tiny, tiny, tiny, {
      rendaMensal: 100_000, idadeAtual: 65, idadeAposentadoria: 65,
      patrimonioAtual: 1_000, rentabilidadeAcumulacao: 6,
      rentabilidadeRetirada: 4, expectativaVida: 90,
    }, false)
    expect(pts.every(p => p.cenarioA !== null && p.cenarioA >= 0 && p.cenarioB >= 0 && p.cenarioC >= 0)).toBe(true)
  })
})

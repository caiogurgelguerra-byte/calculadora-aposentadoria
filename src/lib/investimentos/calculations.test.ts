import { describe, expect, it } from 'vitest'
import type { InvestimentosInputs } from './types'
import {
  addMonths,
  annualToMonthlyRate,
  calculateInvestimentos,
  calculateSavingsMonthlyRate,
  daysBetween,
  getIrRateByDays,
  normalizeInputs,
} from './calculations'

const START_DATE = new Date(2026, 0, 31)

function baseInputs(patch: Partial<InvestimentosInputs> = {}): InvestimentosInputs {
  return {
    initialAmount: 1000,
    hasMonthlyContribution: false,
    monthlyContribution: 0,
    termValue: 12,
    termUnit: 'months',
    cdiAnnualPercent: 12,
    ipcaAnnualPercent: 4,
    rateType: 'cdi_percent',
    cdiPercent: 100,
    fixedAnnualPercent: null,
    ipcaSpreadAnnualPercent: null,
    isTaxExempt: false,
    ...patch,
  }
}

describe('date helpers', () => {
  it('adds months and clamps to last valid day', () => {
    const next = addMonths(new Date(2026, 0, 31), 1)
    expect(next.getFullYear()).toBe(2026)
    expect(next.getMonth()).toBe(1)
    expect(next.getDate()).toBe(28)
  })

  it('calculates elapsed calendar days', () => {
    expect(daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 31))).toBe(30)
  })
})

describe('rates', () => {
  it('converts annual rate to monthly equivalent', () => {
    expect(annualToMonthlyRate(0.12)).toBeCloseTo(Math.pow(1.12, 1 / 12) - 1, 10)
  })

  it('calculates savings monthly rate above 8.5% Selic proxy', () => {
    expect(calculateSavingsMonthlyRate(0.12)).toBe(0.005)
  })

  it('calculates savings monthly rate at or below 8.5% Selic proxy', () => {
    expect(calculateSavingsMonthlyRate(0.08)).toBeCloseTo(Math.pow(1 + 0.08 * 0.7, 1 / 12) - 1, 10)
  })

  it('uses CDI monthly equivalent before applying percent of CDI', () => {
    const result = calculateInvestimentos(baseInputs({ cdiAnnualPercent: 12, cdiPercent: 85 }), START_DATE)
    const expectedMonthlyCdi = Math.pow(1.12, 1 / 12) - 1
    expect(result.result?.simulation[1].customGross).toBeCloseTo(1000 * (1 + expectedMonthlyCdi * 0.85), 2)
  })
})

describe('IR table', () => {
  it('uses regressive tax boundaries by elapsed days', () => {
    expect(getIrRateByDays(180)).toBe(0.225)
    expect(getIrRateByDays(181)).toBe(0.2)
    expect(getIrRateByDays(360)).toBe(0.2)
    expect(getIrRateByDays(361)).toBe(0.175)
    expect(getIrRateByDays(720)).toBe(0.175)
    expect(getIrRateByDays(721)).toBe(0.15)
  })
})

describe('normalizeInputs', () => {
  it('returns errors when CDI and IPCA are empty', () => {
    const state = normalizeInputs(baseInputs({ cdiAnnualPercent: null, ipcaAnnualPercent: null }), START_DATE)
    expect(state.normalized).toBeNull()
    expect(state.errors.cdiAnnualPercent).toBe('Informe o CDI anual.')
    expect(state.errors.ipcaAnnualPercent).toBe('Informe o IPCA anual.')
  })

  it('normalizes human percent inputs to decimal rates', () => {
    const state = normalizeInputs(baseInputs({ cdiAnnualPercent: 10.65, ipcaAnnualPercent: 4.5 }), START_DATE)
    expect(state.normalized?.cdiAnnualRate).toBe(0.1065)
    expect(state.normalized?.ipcaAnnualRate).toBe(0.045)
  })

  it('preserves hasMonthlyContribution but uses zero aporte when disabled', () => {
    const state = normalizeInputs(baseInputs({ hasMonthlyContribution: false, monthlyContribution: 500 }), START_DATE)
    expect(state.normalized?.hasMonthlyContribution).toBe(false)
    expect(state.normalized?.monthlyContribution).toBe(0)
  })
})

describe('calculateInvestimentos', () => {
  it('returns empty result with errors for incomplete inputs', () => {
    const state = calculateInvestimentos(baseInputs({ initialAmount: 0, cdiAnnualPercent: null }), START_DATE)
    expect(state.result).toBeNull()
    expect(state.errors.initialAmount).toBe('Informe valor inicial ou aporte mensal.')
    expect(state.errors.cdiAnnualPercent).toBe('Informe o CDI anual.')
  })

  it('includes the final-month contribution without yield', () => {
    const state = calculateInvestimentos(
      baseInputs({
        initialAmount: 0,
        hasMonthlyContribution: true,
        monthlyContribution: 100,
        termValue: 2,
        fixedAnnualPercent: 12,
        rateType: 'fixed',
        isTaxExempt: true,
      }),
      START_DATE
    )

    const custom = state.result!.rows.find(row => row.id === 'custom')!
    const monthly = Math.pow(1.12, 1 / 12) - 1
    expect(custom.investedTotal).toBe(200)
    expect(custom.grossFinalValue).toBeCloseTo(100 * (1 + monthly) + 100, 2)
  })

  it('calculates lot-based IR using calendar days', () => {
    const state = calculateInvestimentos(
      baseInputs({
        initialAmount: 1000,
        hasMonthlyContribution: true,
        monthlyContribution: 100,
        termValue: 24,
        fixedAnnualPercent: 12,
        rateType: 'fixed',
        isTaxExempt: false,
      }),
      new Date(2026, 0, 1)
    )

    const custom = state.result!.rows.find(row => row.id === 'custom')!
    expect(custom.tax).toBeGreaterThan(0)
    expect(custom.netFinalValue).toBeLessThan(custom.grossFinalValue)
  })

  it('keeps exempt products tax-free and CDB taxed', () => {
    const state = calculateInvestimentos(baseInputs({ termValue: 24 }), START_DATE)
    const cdb = state.result!.rows.find(row => row.id === 'cdb_100_cdi')!
    const lci = state.result!.rows.find(row => row.id === 'lci_lca_85_cdi')!
    const savings = state.result!.rows.find(row => row.id === 'savings')!
    expect(cdb.tax).toBeGreaterThan(0)
    expect(lci.tax).toBe(0)
    expect(savings.tax).toBe(0)
  })

  it('returns four fixed-order rows and month 0..term simulation points', () => {
    const state = calculateInvestimentos(baseInputs({ termValue: 3 }), START_DATE)
    expect(state.result!.rows.map(row => row.id)).toEqual([
      'custom',
      'savings',
      'cdb_100_cdi',
      'lci_lca_85_cdi',
    ])
    expect(state.result!.simulation.map(point => point.month)).toEqual([0, 1, 2, 3])
  })

  it('calculates IPCA+ nominal rate and real gain estimate', () => {
    const state = calculateInvestimentos(
      baseInputs({
        rateType: 'ipca_plus',
        cdiPercent: null,
        ipcaAnnualPercent: 4,
        ipcaSpreadAnnualPercent: 6,
        isTaxExempt: true,
      }),
      START_DATE
    )

    const custom = state.result!.rows.find(row => row.id === 'custom')!
    const nominal = (1 + 0.04) * (1 + 0.06) - 1
    expect(custom.grossFinalValue).toBeCloseTo(1000 * Math.pow(1 + nominal, 1), 2)
    expect(state.result!.realGainEstimate).toBeGreaterThan(0)
  })

  it('emits IOF warning when a taxable positive-yield lot is under 30 days old', () => {
    const state = calculateInvestimentos(
      baseInputs({
        initialAmount: 0,
        hasMonthlyContribution: true,
        monthlyContribution: 100,
        termValue: 1,
        fixedAnnualPercent: 12,
        rateType: 'fixed',
        isTaxExempt: false,
      }),
      START_DATE
    )

    expect(state.result!.warnings).toContain('IOF nao considerado para lotes com menos de 30 dias.')
  })
})

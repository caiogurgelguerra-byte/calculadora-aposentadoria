import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useInvestimentosCalculations } from './useInvestimentosCalculations'
import type { InvestimentosInputs } from '../../lib/investimentos/types'

function inputs(patch: Partial<InvestimentosInputs> = {}): InvestimentosInputs {
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
    cdbPercent: 100,
    lciLcaPercent: 85,
    fixedAnnualPercent: null,
    ipcaSpreadAnnualPercent: null,
    isTaxExempt: false,
    ...patch,
  }
}

describe('useInvestimentosCalculations', () => {
  it('returns calculation result for valid inputs', () => {
    const { result } = renderHook(() =>
      useInvestimentosCalculations(inputs(), { startDate: new Date(2026, 0, 1) })
    )

    expect(result.current.result?.rows).toHaveLength(4)
    expect(result.current.errors).toEqual({})
  })

  it('returns validation errors for invalid inputs', () => {
    const { result } = renderHook(() =>
      useInvestimentosCalculations(inputs({ initialAmount: 0, cdiAnnualPercent: null }))
    )

    expect(result.current.result).toBeNull()
    expect(result.current.errors.initialAmount).toBe('Informe valor inicial ou aporte mensal.')
    expect(result.current.errors.cdiAnnualPercent).toBe('Informe o CDI medio projetado.')
  })

  it('uses injected start date as base date', () => {
    const startDate = new Date(2026, 4, 11)
    const { result } = renderHook(() => useInvestimentosCalculations(inputs(), { startDate }))
    expect(result.current.result?.baseDate).toBe(startDate)
  })
})

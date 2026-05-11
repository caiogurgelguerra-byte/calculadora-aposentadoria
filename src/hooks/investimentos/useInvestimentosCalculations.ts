import { useMemo } from 'react'
import { calculateInvestimentos } from '../../lib/investimentos/calculations'
import type { CalculationState, InvestimentosInputs } from '../../lib/investimentos/types'

interface Options {
  startDate?: Date
}

export function useInvestimentosCalculations(
  inputs: InvestimentosInputs,
  options: Options = {}
): CalculationState {
  const startDate = options.startDate

  return useMemo(
    () => calculateInvestimentos(inputs, startDate ?? new Date()),
    [inputs, startDate]
  )
}

import { useMemo } from 'react'
import type { SalarioInputs, SalarioResult, DecimoResult, ComparativoRow } from '../../lib/salario/types'
import { calcSalarioLiquido, calcDecimo, calcComparativo } from '../../lib/salario/calculations'

export interface SalarioCalculations {
  result: SalarioResult
  decimo: DecimoResult | null
  comparativo: ComparativoRow[]
}

export function useSalarioCalculations(inputs: SalarioInputs): SalarioCalculations {
  return useMemo(() => {
    const result = calcSalarioLiquido(inputs.salarioBruto, inputs.dependentes)
    const decimo = inputs.incluiDecimo ? calcDecimo(inputs.salarioBruto) : null
    const comparativo = calcComparativo(inputs.salarioBruto, inputs.dependentes)
    return { result, decimo, comparativo }
  }, [inputs])
}

import { useState, useCallback } from 'react'
import type { SalarioInputs } from '../lib/salario/types'
import { useSalarioCalculations } from '../hooks/salario/useSalarioCalculations'
import InputForm from '../calculators/salario/InputForm'
import ResultCard from '../calculators/salario/ResultCard'
import ComparisonTable from '../calculators/salario/ComparisonTable'

const DEFAULT_INPUTS: SalarioInputs = {
  salarioBruto: 0,
  dependentes: 0,
  incluiDecimo: false,
  showComparativo: false,
}

export default function SalarioPage() {
  const [inputs, setInputs] = useState<SalarioInputs>(DEFAULT_INPUTS)
  const { result, decimo, comparativo } = useSalarioCalculations(inputs)

  const handleChange = useCallback((next: SalarioInputs) => setInputs(next), [])

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-indigo-700 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">Calculadora de Salário Líquido</h1>
          <p className="text-sm text-blue-200 mt-1">CLT Brasil — INSS 2025 + reforma do IR fev/2026 (isento até R$ 5.000 / redutor proporcional até R$ 7.000)</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-80 shrink-0">
            <InputForm onChange={handleChange} />
          </div>
          <div className="flex-1 flex flex-col gap-4">
            {inputs.salarioBruto > 0 ? (
              <>
                <ResultCard result={result} decimo={inputs.incluiDecimo ? decimo : null} />
                {inputs.showComparativo && <ComparisonTable rows={comparativo} />}
              </>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-slate-200 bg-white text-slate-400">
                <div className="text-center">
                  <div className="text-4xl mb-3">💰</div>
                  <p className="text-base font-semibold text-slate-500">Digite seu salário bruto</p>
                  <p className="text-sm mt-1">Os resultados aparecerão aqui</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

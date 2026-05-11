import { useCallback, useEffect, useMemo, useState } from 'react'
import ComparisonChart from '../calculators/investimentos/ComparisonChart'
import ComparisonTable from '../calculators/investimentos/ComparisonTable'
import InputForm from '../calculators/investimentos/InputForm'
import ResultCards from '../calculators/investimentos/ResultCards'
import { useInvestimentosCalculations } from '../hooks/investimentos/useInvestimentosCalculations'
import { getDefaultProjectedCdiPercent } from '../lib/investimentos/calculations'
import { fetchLatestProjectedCdiByYear, getFallbackProjectedCdiByYear } from '../lib/investimentos/focus'
import type { InvestimentosInputs } from '../lib/investimentos/types'

const DEFAULT_INPUTS: InvestimentosInputs = {
  initialAmount: 0,
  hasMonthlyContribution: false,
  monthlyContribution: 0,
  termValue: 12,
  termUnit: 'months',
  cdiAnnualPercent: 10,
  ipcaAnnualPercent: null,
  rateType: 'cdi_percent',
  cdiPercent: 100,
  cdbPercent: 100,
  lciLcaPercent: 85,
  fixedAnnualPercent: null,
  ipcaSpreadAnnualPercent: null,
  isTaxExempt: false,
}

export default function InvestimentosPage() {
  const [inputs, setInputs] = useState<InvestimentosInputs>(DEFAULT_INPUTS)
  const [autoProjectedCdiEnabled, setAutoProjectedCdiEnabled] = useState(true)
  const [projectedCdiByYear, setProjectedCdiByYear] = useState<Record<number, number>>(getFallbackProjectedCdiByYear())
  const { result, errors } = useInvestimentosCalculations(inputs)

  const termMonths = useMemo(
    () => (inputs.termUnit === 'years' ? inputs.termValue * 12 : inputs.termValue),
    [inputs.termUnit, inputs.termValue]
  )

  useEffect(() => {
    let active = true

    fetchLatestProjectedCdiByYear()
      .then((nextProjectedCdiByYear) => {
        if (!active || Object.keys(nextProjectedCdiByYear).length === 0) return
        setProjectedCdiByYear(nextProjectedCdiByYear)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!autoProjectedCdiEnabled) return

    setInputs((current) => ({
      ...current,
      cdiAnnualPercent: getDefaultProjectedCdiPercent(termMonths, projectedCdiByYear),
    }))
  }, [autoProjectedCdiEnabled, projectedCdiByYear, termMonths])

  const handleChange = useCallback((next: InvestimentosInputs) => {
    setInputs(next)
  }, [])

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-indigo-700 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">Calculadora de Investimentos</h1>
          <p className="text-sm text-blue-200 mt-2 max-w-3xl leading-relaxed">
            Compare seu investimento com poupanca, CDB e LCI/LCA usando percentuais do CDI editaveis.
            O CDI medio projetado pode ser preenchido automaticamente e continuar editavel.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-96 shrink-0">
            <InputForm
              value={inputs}
              errors={errors}
              onChange={handleChange}
              onCdiManualChange={() => setAutoProjectedCdiEnabled(false)}
            />
          </div>

          <div className="flex-1 flex flex-col gap-4">
            {result ? (
              <>
                <ResultCards result={result} />
                <ComparisonChart simulation={result.simulation} rows={result.rows} />
                <ComparisonTable rows={result.rows} />
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
                  Valores estimados. A simulacao nao considera marcacao a mercado, spread, taxas, carencia,
                  liquidez, risco de credito, cobertura, limites ou elegibilidade do FGC, mudancas futuras de
                  tributacao, come-cotas ou IOF.
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-slate-200 bg-white text-slate-400">
                <div className="text-center px-4">
                  <div className="text-4xl mb-3">R$</div>
                  <p className="text-base font-semibold text-slate-500">Preencha os dados do investimento</p>
                  <p className="text-sm mt-1">Os resultados aparecerao aqui</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

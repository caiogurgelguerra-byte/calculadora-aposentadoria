import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ComparisonChart from '../calculators/investimentos/ComparisonChart'
import ComparisonTable from '../calculators/investimentos/ComparisonTable'
import InputForm from '../calculators/investimentos/InputForm'
import ResultCards from '../calculators/investimentos/ResultCards'
import { useInvestimentosCalculations } from '../hooks/investimentos/useInvestimentosCalculations'
import { getDefaultProjectedCdiPercent } from '../lib/investimentos/calculations'
import { getFallbackProjectedCdiByYear, resolveProjectedCdiByYear, type ProjectedCdiSource } from '../lib/investimentos/focus'
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

const TOOL_CARDS = [
  {
    to: '/investimentos',
    kicker: 'Agora',
    title: 'Investimentos',
    description: 'Compare renda fixa, imposto e alternativas atreladas ao CDI.',
    active: true,
  },
  {
    to: '/aposentadoria',
    kicker: 'Aberta',
    title: 'Aposentadoria',
    description: 'Projete quanto precisa investir para manter sua renda futura.',
    active: false,
  },
  {
    to: '/salario',
    kicker: 'Aberta',
    title: 'Salário líquido',
    description: 'Calcule o valor aproximado que cai na conta após descontos.',
    active: false,
  },
]

export default function InvestimentosPage() {
  const [inputs, setInputs] = useState<InvestimentosInputs>(DEFAULT_INPUTS)
  const [autoProjectedCdiEnabled, setAutoProjectedCdiEnabled] = useState(true)
  const [projectedCdiByYear, setProjectedCdiByYear] = useState<Record<number, number>>(getFallbackProjectedCdiByYear())
  const [cdiSource, setCdiSource] = useState<ProjectedCdiSource>('local_default')
  const { result, errors } = useInvestimentosCalculations(inputs)
  const enablePublicCdiFetch = import.meta.env.VITE_ENABLE_PUBLIC_BCB_FOCUS_FETCH === 'true'

  const termMonths = useMemo(
    () => (inputs.termUnit === 'years' ? inputs.termValue * 12 : inputs.termValue),
    [inputs.termUnit, inputs.termValue]
  )

  useEffect(() => {
    if (!enablePublicCdiFetch) {
      setCdiSource('local_default')
      return
    }

    let active = true

    resolveProjectedCdiByYear({
      enablePublicFetch: enablePublicCdiFetch,
    })
      .then(({ projectedByYear, source }) => {
        if (!active) return
        setProjectedCdiByYear(projectedByYear)
        setCdiSource(source)
      })

    return () => {
      active = false
    }
  }, [enablePublicCdiFetch])

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
    <div className="bg-[#f6f7f9]">
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-8 lg:py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Ferramentas abertas
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Calculadora de Investimentos
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Simule seu investimento e compare com poupança, CDB e LCI/LCA em uma leitura simples de bruto,
                imposto e valor líquido no resgate.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Acesso</p>
                <p className="mt-1 font-semibold text-slate-900">Aberto</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Base</p>
                <p className="mt-1 font-semibold text-slate-900">CDI</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Leitura</p>
                <p className="mt-1 font-semibold text-slate-900">Líquida</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="tools-title" className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="tools-title" className="text-base font-semibold text-slate-950">
              Ferramentas financeiras
            </h2>
            <p className="text-sm text-slate-500">Calculadoras abertas para apoiar decisões do dia a dia.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {TOOL_CARDS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className={`rounded-lg border bg-white p-4 transition-colors hover:border-slate-300 ${
                tool.active ? 'border-slate-900 shadow-sm' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{tool.kicker}</span>
                {tool.active ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    Em uso
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-950">{tool.title}</h3>
              <p className="mt-1 text-sm leading-5 text-slate-500">{tool.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="simulator-title" className="max-w-7xl mx-auto px-4 pb-8">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
              <h2 id="simulator-title" className="text-base font-semibold text-slate-950">
              Simulador
            </h2>
            <p className="text-sm text-slate-500">Preencha as premissas e acompanhe o comparativo ao lado.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[390px_minmax(0,1fr)] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <InputForm
              value={inputs}
              errors={errors}
              onChange={handleChange}
              onCdiManualChange={() => setAutoProjectedCdiEnabled(false)}
              cdiSource={cdiSource}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            {result ? (
              <>
                <ResultCards result={result} />
                <ComparisonChart simulation={result.simulation} rows={result.rows} />
                <ComparisonTable rows={result.rows} />
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
                  Valores estimados. A simulação não considera marcação a mercado, spread, taxas, carência,
                  liquidez, risco de crédito, cobertura, limites ou elegibilidade do FGC, mudanças futuras de
                  tributação, come-cotas ou IOF.
                </div>
              </>
            ) : (
              <div className="flex min-h-[24rem] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
                <div className="px-4 text-center">
                  <p className="text-sm font-semibold text-slate-600">Preencha os dados do investimento</p>
                  <p className="mt-1 text-sm text-slate-500">Os resultados aparecerao aqui.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

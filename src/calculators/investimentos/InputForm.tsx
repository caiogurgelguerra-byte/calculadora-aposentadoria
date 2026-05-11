import { useEffect, useState } from 'react'
import {
  formatMoneyInput,
  formatPercentInput,
  parseBrazilianMoney,
  parseBrazilianPercent,
} from '../../lib/investimentos/format'
import type { ProjectedCdiSource } from '../../lib/investimentos/focus'
import type { InvestimentosErrors, InvestimentosInputs, RateType, TermUnit } from '../../lib/investimentos/types'

interface Props {
  value: InvestimentosInputs
  errors: InvestimentosErrors
  onChange: (next: InvestimentosInputs) => void
  onCdiManualChange: () => void
  cdiSource: ProjectedCdiSource
}

function toMoneyInputValue(value: number): string {
  return value > 0 ? formatMoneyInput(value) : ''
}

function toPercentInputValue(value: number | null): string {
  return formatPercentInput(value)
}

function getCdiHelperText(cdiSource: ProjectedCdiSource): string {
  if (cdiSource === 'bcb_focus') {
    return 'Este e o CDI medio considerado para o prazo escolhido. Voce pode ajustar.'
  }

  if (cdiSource === 'local_default_unavailable') {
    return 'Este e o CDI medio considerado para o prazo escolhido. Voce pode ajustar.'
  }

  return 'Este e o CDI medio considerado para o prazo escolhido. Voce pode ajustar.'
}

export default function InputForm({ value, errors, onChange, onCdiManualChange, cdiSource }: Props) {
  const [initialAmount, setInitialAmount] = useState(toMoneyInputValue(value.initialAmount))
  const [monthlyContribution, setMonthlyContribution] = useState(toMoneyInputValue(value.monthlyContribution))
  const [cdiAnnualPercent, setCdiAnnualPercent] = useState(toPercentInputValue(value.cdiAnnualPercent))
  const [ipcaAnnualPercent, setIpcaAnnualPercent] = useState(toPercentInputValue(value.ipcaAnnualPercent))
  const [cdiPercent, setCdiPercent] = useState(toPercentInputValue(value.cdiPercent))
  const [cdbPercent, setCdbPercent] = useState(toPercentInputValue(value.cdbPercent))
  const [lciLcaPercent, setLciLcaPercent] = useState(toPercentInputValue(value.lciLcaPercent))
  const [fixedAnnualPercent, setFixedAnnualPercent] = useState(toPercentInputValue(value.fixedAnnualPercent))
  const [ipcaSpreadAnnualPercent, setIpcaSpreadAnnualPercent] = useState(toPercentInputValue(value.ipcaSpreadAnnualPercent))
  const [termValue, setTermValue] = useState('12')
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const update = (patch: Partial<InvestimentosInputs>) => onChange({ ...value, ...patch })

  useEffect(() => {
    if (focusedField === 'initialAmount') return
    setInitialAmount(toMoneyInputValue(value.initialAmount))
  }, [focusedField, value.initialAmount])

  useEffect(() => {
    if (focusedField === 'monthlyContribution') return
    setMonthlyContribution(toMoneyInputValue(value.monthlyContribution))
  }, [focusedField, value.monthlyContribution])

  useEffect(() => {
    if (focusedField === 'cdiAnnualPercent') return
    setCdiAnnualPercent(toPercentInputValue(value.cdiAnnualPercent))
  }, [focusedField, value.cdiAnnualPercent])

  useEffect(() => {
    if (focusedField === 'ipcaAnnualPercent') return
    setIpcaAnnualPercent(toPercentInputValue(value.ipcaAnnualPercent))
  }, [focusedField, value.ipcaAnnualPercent])

  useEffect(() => {
    if (focusedField === 'cdiPercent') return
    setCdiPercent(toPercentInputValue(value.cdiPercent))
  }, [focusedField, value.cdiPercent])

  useEffect(() => {
    if (focusedField === 'cdbPercent') return
    setCdbPercent(toPercentInputValue(value.cdbPercent))
  }, [focusedField, value.cdbPercent])

  useEffect(() => {
    if (focusedField === 'lciLcaPercent') return
    setLciLcaPercent(toPercentInputValue(value.lciLcaPercent))
  }, [focusedField, value.lciLcaPercent])

  useEffect(() => {
    if (focusedField === 'fixedAnnualPercent') return
    setFixedAnnualPercent(toPercentInputValue(value.fixedAnnualPercent))
  }, [focusedField, value.fixedAnnualPercent])

  useEffect(() => {
    if (focusedField === 'ipcaSpreadAnnualPercent') return
    setIpcaSpreadAnnualPercent(toPercentInputValue(value.ipcaSpreadAnnualPercent))
  }, [focusedField, value.ipcaSpreadAnnualPercent])

  useEffect(() => {
    if (focusedField === 'termValue') return
    setTermValue(String(value.termValue))
  }, [focusedField, value.termValue])

  const inputErrorProps = (field: keyof InvestimentosErrors) => {
    const hasError = Boolean(errors[field])
    return {
      'aria-invalid': hasError || undefined,
      'aria-describedby': hasError ? `${field}-error` : undefined,
    }
  }

  const renderError = (field: keyof InvestimentosErrors) =>
    errors[field] ? (
      <p id={`${field}-error`} className="text-xs text-red-600 mt-1">
        {errors[field]}
      </p>
    ) : null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Dados do investimento</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">Valor inicial</span>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
          <input
            type="text"
            aria-label="Valor inicial"
            inputMode="decimal"
            className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0,00"
            value={initialAmount}
            onFocus={() => setFocusedField('initialAmount')}
            onChange={(event) => {
              setInitialAmount(event.target.value)
              update({ initialAmount: parseBrazilianMoney(event.target.value) })
            }}
            onBlur={() => {
              setFocusedField(null)
              setInitialAmount(toMoneyInputValue(value.initialAmount))
            }}
            {...inputErrorProps('initialAmount')}
          />
        </div>
        <p className="text-xs text-gray-500">Valor aplicado hoje, antes de qualquer rendimento.</p>
        {renderError('initialAmount')}
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-gray-700">Aporte mensal</legend>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-blue-600"
            checked={value.hasMonthlyContribution}
            onChange={(event) => update({ hasMonthlyContribution: event.target.checked })}
          />
          <span className="text-sm font-medium text-gray-600">Fazer aportes mensais</span>
        </label>
        {value.hasMonthlyContribution ? (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Valor do aporte mensal</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
              <input
                type="text"
                aria-label="Valor do aporte mensal"
                inputMode="decimal"
                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0,00"
                value={monthlyContribution}
                onFocus={() => setFocusedField('monthlyContribution')}
                onChange={(event) => {
                  setMonthlyContribution(event.target.value)
                  update({ monthlyContribution: parseBrazilianMoney(event.target.value) })
                }}
                onBlur={() => {
                  setFocusedField(null)
                  setMonthlyContribution(toMoneyInputValue(value.monthlyContribution))
                }}
                {...inputErrorProps('monthlyContribution')}
              />
            </div>
            <p className="text-xs text-gray-500">Aporte considerado no fim de cada mes.</p>
            {renderError('monthlyContribution')}
          </label>
        ) : null}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">Prazo</span>
          <input
            type="number"
            aria-label="Prazo"
            min={1}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={termValue}
            onFocus={() => setFocusedField('termValue')}
            onChange={(event) => {
              setTermValue(event.target.value)
              const parsed = Number.parseInt(event.target.value, 10)
              update({ termValue: Number.isFinite(parsed) ? parsed : 0 })
            }}
            onBlur={() => {
              setFocusedField(null)
              setTermValue(String(value.termValue))
            }}
            {...inputErrorProps('termValue')}
          />
          {renderError('termValue')}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">Unidade</span>
          <select
            aria-label="Unidade"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={value.termUnit}
            onChange={(event) => update({ termUnit: event.target.value as TermUnit })}
          >
            <option value="months">Meses</option>
            <option value="years">Anos</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">CDI medio projetado</span>
        <div className="relative">
          <input
            type="text"
            aria-label="CDI medio projetado"
            inputMode="decimal"
            className="w-full border border-gray-300 rounded-lg px-3 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="10,00"
            value={cdiAnnualPercent}
            onFocus={() => setFocusedField('cdiAnnualPercent')}
            onChange={(event) => {
              setCdiAnnualPercent(event.target.value)
              update({ cdiAnnualPercent: parseBrazilianPercent(event.target.value) })
              onCdiManualChange()
            }}
            onBlur={() => {
              setFocusedField(null)
              setCdiAnnualPercent(toPercentInputValue(value.cdiAnnualPercent))
            }}
            {...inputErrorProps('cdiAnnualPercent')}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
        </div>
        <p className="text-xs text-gray-500">{getCdiHelperText(cdiSource)}</p>
        {renderError('cdiAnnualPercent')}
      </label>

      <fieldset className="flex flex-col gap-2 border-t border-gray-100 pt-3">
        <legend className="text-sm font-semibold text-gray-700">Tipo de rentabilidade</legend>
        <div className="flex flex-col gap-2 text-sm text-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="rateType"
              checked={value.rateType === 'cdi_percent'}
              onChange={() => update({ rateType: 'cdi_percent' as RateType })}
            />
            <span>% do CDI</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              aria-label="Prefixado"
              name="rateType"
              checked={value.rateType === 'fixed'}
              onChange={() => update({ rateType: 'fixed' as RateType })}
            />
            <span>Prefixado</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              aria-label="IPCA + taxa"
              name="rateType"
              checked={value.rateType === 'ipca_plus'}
              onChange={() => update({ rateType: 'ipca_plus' as RateType })}
            />
            <span>IPCA + taxa</span>
          </label>
        </div>
      </fieldset>

      {value.rateType === 'cdi_percent' ? (
        <>
          <div className="pt-1 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Premissas de comparacao</p>
            <p className="text-xs text-gray-500 mt-1">
              Ajuste os percentuais usados como referencia para CDB e LCI/LCA.
            </p>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Seu investimento (% do CDI)</span>
            <div className="relative">
              <input
                type="text"
                aria-label="% do CDI"
                inputMode="decimal"
                className="w-full border border-gray-300 rounded-lg px-3 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100"
                value={cdiPercent}
                onFocus={() => setFocusedField('cdiPercent')}
                onChange={(event) => {
                  setCdiPercent(event.target.value)
                  update({ cdiPercent: parseBrazilianPercent(event.target.value) })
                }}
                onBlur={() => {
                  setFocusedField(null)
                  setCdiPercent(toPercentInputValue(value.cdiPercent))
                }}
                {...inputErrorProps('cdiPercent')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
            </div>
            <p className="text-xs text-gray-500">Use 100 para 100% do CDI, 85 para 85%, 110 para 110%.</p>
            {renderError('cdiPercent')}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">CDB (% do CDI)</span>
            <div className="relative">
              <input
                type="text"
                aria-label="% do CDI do CDB"
                inputMode="decimal"
                className="w-full border border-gray-300 rounded-lg px-3 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100"
                value={cdbPercent}
                onFocus={() => setFocusedField('cdbPercent')}
                onChange={(event) => {
                  setCdbPercent(event.target.value)
                  update({ cdbPercent: parseBrazilianPercent(event.target.value) })
                }}
                onBlur={() => {
                  setFocusedField(null)
                  setCdbPercent(toPercentInputValue(value.cdbPercent))
                }}
                {...inputErrorProps('cdbPercent')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
            </div>
            {renderError('cdbPercent')}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">LCI/LCA (% do CDI)</span>
            <div className="relative">
              <input
                type="text"
                aria-label="% do CDI da LCI/LCA"
                inputMode="decimal"
                className="w-full border border-gray-300 rounded-lg px-3 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="85"
                value={lciLcaPercent}
                onFocus={() => setFocusedField('lciLcaPercent')}
                onChange={(event) => {
                  setLciLcaPercent(event.target.value)
                  update({ lciLcaPercent: parseBrazilianPercent(event.target.value) })
                }}
                onBlur={() => {
                  setFocusedField(null)
                  setLciLcaPercent(toPercentInputValue(value.lciLcaPercent))
                }}
                {...inputErrorProps('lciLcaPercent')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
            </div>
            {renderError('lciLcaPercent')}
          </label>
        </>
      ) : null}

      {value.rateType === 'fixed' ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">Taxa prefixada anual</span>
          <div className="relative">
            <input
              type="text"
              aria-label="Taxa prefixada anual"
              inputMode="decimal"
              className="w-full border border-gray-300 rounded-lg px-3 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="12,00"
              value={fixedAnnualPercent}
              onFocus={() => setFocusedField('fixedAnnualPercent')}
              onChange={(event) => {
                setFixedAnnualPercent(event.target.value)
                update({ fixedAnnualPercent: parseBrazilianPercent(event.target.value) })
              }}
              onBlur={() => {
                setFocusedField(null)
                setFixedAnnualPercent(toPercentInputValue(value.fixedAnnualPercent))
              }}
              {...inputErrorProps('fixedAnnualPercent')}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
          </div>
          <p className="text-xs text-gray-500">Taxa anual fixa da aplicacao. Exemplo: 12,00.</p>
          {renderError('fixedAnnualPercent')}
        </label>
      ) : null}

      {value.rateType === 'ipca_plus' ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">IPCA anual</span>
            <div className="relative">
              <input
                type="text"
                aria-label="IPCA anual"
                inputMode="decimal"
                className="w-full border border-gray-300 rounded-lg px-3 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="4,50"
                value={ipcaAnnualPercent}
                onFocus={() => setFocusedField('ipcaAnnualPercent')}
                onChange={(event) => {
                  setIpcaAnnualPercent(event.target.value)
                  update({ ipcaAnnualPercent: parseBrazilianPercent(event.target.value) })
                }}
                onBlur={() => {
                  setFocusedField(null)
                  setIpcaAnnualPercent(toPercentInputValue(value.ipcaAnnualPercent))
                }}
                {...inputErrorProps('ipcaAnnualPercent')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
            </div>
            <p className="text-xs text-gray-500">Usado apenas para simulacoes IPCA + taxa.</p>
            {renderError('ipcaAnnualPercent')}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Taxa real acima do IPCA</span>
            <div className="relative">
              <input
                type="text"
                aria-label="Taxa real acima do IPCA"
                inputMode="decimal"
                className="w-full border border-gray-300 rounded-lg px-3 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="6,00"
                value={ipcaSpreadAnnualPercent}
                onFocus={() => setFocusedField('ipcaSpreadAnnualPercent')}
                onChange={(event) => {
                  setIpcaSpreadAnnualPercent(event.target.value)
                  update({ ipcaSpreadAnnualPercent: parseBrazilianPercent(event.target.value) })
                }}
                onBlur={() => {
                  setFocusedField(null)
                  setIpcaSpreadAnnualPercent(toPercentInputValue(value.ipcaSpreadAnnualPercent))
                }}
                {...inputErrorProps('ipcaSpreadAnnualPercent')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
            </div>
            <p className="text-xs text-gray-500">Ganho real esperado alem da inflacao. Exemplo: 6,00.</p>
            {renderError('ipcaSpreadAnnualPercent')}
          </label>
        </>
      ) : null}

      <fieldset className="flex flex-col gap-2 border-t border-gray-100 pt-3">
        <legend className="text-sm font-semibold text-gray-700">Imposto de renda</legend>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-blue-600"
            checked={value.isTaxExempt}
            onChange={(event) => update({ isTaxExempt: event.target.checked })}
          />
          <span className="text-sm font-medium text-gray-600">Aplicacao isenta de IR</span>
        </label>
        <p className="text-xs text-gray-500">Desmarcado: aplica tabela regressiva de IR no resgate final.</p>
      </fieldset>
    </div>
  )
}

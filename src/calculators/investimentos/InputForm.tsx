import { useState } from 'react'
import { parseBrazilianMoney, parseBrazilianPercent } from '../../lib/investimentos/format'
import type { InvestimentosErrors, InvestimentosInputs, RateType, TermUnit } from '../../lib/investimentos/types'

interface Props {
  value: InvestimentosInputs
  errors: InvestimentosErrors
  onChange: (next: InvestimentosInputs) => void
}

export default function InputForm({ value, errors, onChange }: Props) {
  const [initialAmount, setInitialAmount] = useState('')
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [cdiAnnualPercent, setCdiAnnualPercent] = useState('')
  const [ipcaAnnualPercent, setIpcaAnnualPercent] = useState('')
  const [cdiPercent, setCdiPercent] = useState('100')
  const [fixedAnnualPercent, setFixedAnnualPercent] = useState('')
  const [ipcaSpreadAnnualPercent, setIpcaSpreadAnnualPercent] = useState('')
  const [termValue, setTermValue] = useState('12')

  const update = (patch: Partial<InvestimentosInputs>) => onChange({ ...value, ...patch })

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
        <input
          type="text"
          aria-label="Valor inicial"
          inputMode="decimal"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0,00"
          value={initialAmount}
          onChange={(event) => {
            setInitialAmount(event.target.value)
            update({ initialAmount: parseBrazilianMoney(event.target.value) })
          }}
          {...inputErrorProps('initialAmount')}
        />
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
            <input
              type="text"
              aria-label="Valor do aporte mensal"
              inputMode="decimal"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0,00"
              value={monthlyContribution}
              onChange={(event) => {
                setMonthlyContribution(event.target.value)
                update({ monthlyContribution: parseBrazilianMoney(event.target.value) })
              }}
              {...inputErrorProps('monthlyContribution')}
            />
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
            onChange={(event) => {
              setTermValue(event.target.value)
              const parsed = Number.parseInt(event.target.value, 10)
              update({ termValue: Number.isFinite(parsed) ? parsed : 0 })
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
        <span className="text-sm font-medium text-gray-600">CDI anual</span>
        <input
          type="text"
          aria-label="CDI anual"
          inputMode="decimal"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="10,65"
          value={cdiAnnualPercent}
          onChange={(event) => {
            setCdiAnnualPercent(event.target.value)
            update({ cdiAnnualPercent: parseBrazilianPercent(event.target.value) })
          }}
          {...inputErrorProps('cdiAnnualPercent')}
        />
        <p className="text-xs text-gray-500">Premissa editavel. Exemplo: 10,65 = 10,65% ao ano.</p>
        {renderError('cdiAnnualPercent')}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">IPCA anual</span>
        <input
          type="text"
          aria-label="IPCA anual"
          inputMode="decimal"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="4,50"
          value={ipcaAnnualPercent}
          onChange={(event) => {
            setIpcaAnnualPercent(event.target.value)
            update({ ipcaAnnualPercent: parseBrazilianPercent(event.target.value) })
          }}
          {...inputErrorProps('ipcaAnnualPercent')}
        />
        <p className="text-xs text-gray-500">Premissa editavel de inflacao para a simulacao.</p>
        {renderError('ipcaAnnualPercent')}
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
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">% do CDI</span>
          <input
            type="text"
            aria-label="% do CDI"
            inputMode="decimal"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="100"
            value={cdiPercent}
            onChange={(event) => {
              setCdiPercent(event.target.value)
              update({ cdiPercent: parseBrazilianPercent(event.target.value) })
            }}
            {...inputErrorProps('cdiPercent')}
          />
          <p className="text-xs text-gray-500">Use 100 para 100% do CDI, 85 para 85%, 110 para 110%.</p>
          {renderError('cdiPercent')}
        </label>
      ) : null}

      {value.rateType === 'fixed' ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">Taxa prefixada anual</span>
          <input
            type="text"
            aria-label="Taxa prefixada anual"
            inputMode="decimal"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="12,00"
            value={fixedAnnualPercent}
            onChange={(event) => {
              setFixedAnnualPercent(event.target.value)
              update({ fixedAnnualPercent: parseBrazilianPercent(event.target.value) })
            }}
            {...inputErrorProps('fixedAnnualPercent')}
          />
          <p className="text-xs text-gray-500">Taxa anual fixa da aplicacao. Exemplo: 12,00.</p>
          {renderError('fixedAnnualPercent')}
        </label>
      ) : null}

      {value.rateType === 'ipca_plus' ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">Taxa real acima do IPCA</span>
          <input
            type="text"
            aria-label="Taxa real acima do IPCA"
            inputMode="decimal"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="6,00"
            value={ipcaSpreadAnnualPercent}
            onChange={(event) => {
              setIpcaSpreadAnnualPercent(event.target.value)
              update({ ipcaSpreadAnnualPercent: parseBrazilianPercent(event.target.value) })
            }}
            {...inputErrorProps('ipcaSpreadAnnualPercent')}
          />
          <p className="text-xs text-gray-500">Ganho real esperado alem da inflacao. Exemplo: 6,00.</p>
          {renderError('ipcaSpreadAnnualPercent')}
        </label>
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

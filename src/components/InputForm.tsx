import { useState } from 'react'
import type { UserInputs } from '../lib/types'

interface Props {
  onChange: (inputs: UserInputs) => void
}

const DEFAULTS: UserInputs = {
  rendaMensal: 0,
  idadeAtual: 0,
  idadeAposentadoria: 0,
  patrimonioAtual: 0,
  rentabilidadeAcumulacao: 6,
  rentabilidadeRetirada: 4,
  expectativaVida: 85,
}

function parseMoney(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

function formatMoney(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function InputForm({ onChange }: Props) {
  const [inputs, setInputs] = useState<UserInputs>(DEFAULTS)
  const [showAdvanced, setShowAdvanced] = useState(false)

  function update<K extends keyof UserInputs>(key: K, value: UserInputs[K]) {
    const next = { ...inputs, [key]: value }
    setInputs(next)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100 h-fit">
      <h2 className="text-lg font-semibold text-gray-700">Seus dados</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">Renda mensal desejada</span>
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
          <span className="text-gray-400 mr-1 text-sm">R$</span>
          <input
            type="text"
            inputMode="decimal"
            className="flex-1 outline-none text-sm"
            placeholder="10.000,00"
            value={formatMoney(inputs.rendaMensal)}
            onChange={e => update('rendaMensal', parseMoney(e.target.value))}
          />
        </div>
      </label>

      <div className="flex gap-3">
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-sm font-medium text-gray-600">Idade atual</span>
          <input
            type="number"
            min={18} max={70}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="30"
            value={inputs.idadeAtual || ''}
            onChange={e => update('idadeAtual', parseInt(e.target.value) || 0)}
          />
        </label>
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-sm font-medium text-gray-600">Aposentar-se com</span>
          <input
            type="number"
            min={19} max={80}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="60"
            value={inputs.idadeAposentadoria || ''}
            onChange={e => update('idadeAposentadoria', parseInt(e.target.value) || 0)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">Patrimônio atual investido</span>
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
          <span className="text-gray-400 mr-1 text-sm">R$</span>
          <input
            type="text"
            inputMode="decimal"
            className="flex-1 outline-none text-sm"
            placeholder="0,00"
            value={formatMoney(inputs.patrimonioAtual)}
            onChange={e => update('patrimonioAtual', parseMoney(e.target.value))}
          />
        </div>
      </label>

      <button
        type="button"
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium w-fit"
        onClick={() => setShowAdvanced(v => !v)}
      >
        <span>{showAdvanced ? '▼' : '▶'}</span>
        Parâmetros avançados
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Rentabilidade real na acumulação (% a.a.)</span>
            <input
              type="number"
              step={0.1} min={0} max={30}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.rentabilidadeAcumulacao}
              onChange={e => update('rentabilidadeAcumulacao', parseFloat(e.target.value) || 0)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Rentabilidade real na retirada (% a.a.)</span>
            <input
              type="number"
              step={0.1} min={0} max={30}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.rentabilidadeRetirada}
              onChange={e => update('rentabilidadeRetirada', parseFloat(e.target.value) || 0)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Expectativa de vida (anos)</span>
            <input
              type="number"
              min={60} max={120}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.expectativaVida}
              onChange={e => update('expectativaVida', parseInt(e.target.value) || 85)}
            />
          </label>
        </div>
      )}
    </div>
  )
}

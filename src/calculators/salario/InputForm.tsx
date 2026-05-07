import { useState } from 'react'
import type { SalarioInputs } from '../../lib/salario/types'

interface Props {
  onChange: (inputs: SalarioInputs) => void
}

function parseMoney(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

function formatMoney(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function InputForm({ onChange }: Props) {
  const [salarioBrutoStr, setSalarioBrutoStr] = useState('')
  const [inputs, setInputs] = useState<SalarioInputs>({
    salarioBruto: 0,
    dependentes: 0,
    incluiDecimo: false,
    showComparativo: false,
  })
  const [showDetalhes, setShowDetalhes] = useState(false)

  function update(patch: Partial<SalarioInputs>) {
    const next = { ...inputs, ...patch }
    setInputs(next)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100 h-fit">
      <h2 className="text-lg font-semibold text-gray-700">Seus dados</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">Salário bruto</span>
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
          <span className="text-gray-400 mr-1 text-sm">R$</span>
          <input
            type="text"
            inputMode="decimal"
            className="flex-1 outline-none text-sm"
            placeholder="5.000,00"
            value={salarioBrutoStr}
            onChange={e => {
              setSalarioBrutoStr(e.target.value)
              update({ salarioBruto: parseMoney(e.target.value) })
            }}
            onBlur={() => setSalarioBrutoStr(formatMoney(inputs.salarioBruto))}
          />
        </div>
      </label>

      <div className="relative flex items-center">
        <div className="flex-1 border-t border-gray-200" />
        <button
          type="button"
          className="mx-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-white px-1 transition-colors"
          onClick={() => setShowDetalhes(v => !v)}
        >
          <span className="text-[10px]">{showDetalhes ? '▼' : '▶'}</span>
          Detalhes
        </button>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {showDetalhes && (
        <div className="flex flex-col gap-4 border-t border-gray-100 pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Número de dependentes</span>
            <input
              type="number"
              min={0}
              max={20}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.dependentes}
              onChange={e => update({ dependentes: parseInt(e.target.value) || 0 })}
            />
            <span className="text-xs text-gray-400">Cada dependente deduz R$ 189,59 da base do IR</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-blue-600"
              checked={inputs.incluiDecimo}
              onChange={e => update({ incluiDecimo: e.target.checked })}
            />
            <span className="text-sm font-medium text-gray-600">Calcular 13º salário</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-blue-600"
              checked={inputs.showComparativo}
              onChange={e => update({ showComparativo: e.target.checked })}
            />
            <span className="text-sm font-medium text-gray-600">Mostrar comparativo por faixa</span>
          </label>
        </div>
      )}
    </div>
  )
}

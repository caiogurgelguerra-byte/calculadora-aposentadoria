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
  const [outrosDescontosStr, setOutrosDescontosStr] = useState('')
  const [beneficiosStr, setBeneficiosStr] = useState('')
  const [inputs, setInputs] = useState<SalarioInputs>({
    salarioBruto: 0,
    dependentes: 0,
    incluiDecimo: false,
    showComparativo: false,
    outrosDescontos: 0,
    beneficios: 0,
    horasExtras50: 0,
    horasExtras100: 0,
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

          <div className="border-t border-gray-100 pt-3 flex flex-col gap-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Outros valores</p>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-600">Outros descontos</span>
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                <span className="text-gray-400 mr-1 text-sm">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="flex-1 outline-none text-sm"
                  placeholder="0,00"
                  value={outrosDescontosStr}
                  onChange={e => {
                    setOutrosDescontosStr(e.target.value)
                    update({ outrosDescontos: parseMoney(e.target.value) })
                  }}
                  onBlur={() => setOutrosDescontosStr(formatMoney(inputs.outrosDescontos))}
                />
              </div>
              <span className="text-xs text-gray-400 leading-relaxed">
                Valores que saem do salário <em>depois</em> de INSS e IR. Ex.: vale-transporte (até 6% do bruto), plano de saúde, plano dental, contribuição sindical, empréstimo consignado, faltas e atrasos.
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-600">Benefícios (recebimentos extras)</span>
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                <span className="text-gray-400 mr-1 text-sm">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="flex-1 outline-none text-sm"
                  placeholder="0,00"
                  value={beneficiosStr}
                  onChange={e => {
                    setBeneficiosStr(e.target.value)
                    update({ beneficios: parseMoney(e.target.value) })
                  }}
                  onBlur={() => setBeneficiosStr(formatMoney(inputs.beneficios))}
                />
              </div>
              <span className="text-xs text-gray-400 leading-relaxed">
                Valores recebidos além do salário e que <em>não</em> entram na base de INSS/IR. Ex.: vale-refeição (VR), vale-alimentação (VA), vale-cultura, ajuda de custo, prêmios não habituais. Somam ao total recebido no mês.
              </span>
            </label>
          </div>

          <div className="border-t border-gray-100 pt-3 flex flex-col gap-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Horas extras (CLT — opcional)</p>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-600">Horas extras 50% (semana)</span>
              <input
                type="number"
                min={0}
                step={1}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={inputs.horasExtras50 || ''}
                placeholder="0"
                onChange={e => update({ horasExtras50: parseInt(e.target.value) || 0 })}
              />
              <span className="text-xs text-gray-400 leading-relaxed">
                HE em dias úteis: hora-base + 50% (CLT art. 7º, XVI). A hora-base usa jornada de 220h/mês (44h/semana).
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-600">Horas extras 100% (domingo/feriado)</span>
              <input
                type="number"
                min={0}
                step={1}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={inputs.horasExtras100 || ''}
                placeholder="0"
                onChange={e => update({ horasExtras100: parseInt(e.target.value) || 0 })}
              />
              <span className="text-xs text-gray-400 leading-relaxed">
                HE em domingos e feriados não compensados: hora-base + 100% (Súmula 146 TST). As HE somam ao bruto e entram na base de INSS e IR.
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

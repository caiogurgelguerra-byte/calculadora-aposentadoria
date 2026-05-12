import { useState } from 'react'
import type { UserInputs } from '../../lib/aposentadoria/types'

interface Props {
  onChange: (inputs: UserInputs) => void
}

function parseMoneyDigits(value: string): number {
  const normalized = value
    .replace(/\s/g, '')
    .replace(/^R\$/i, '')
    .replace(/\./g, '')
    .replace(',', '.')

  if (!normalized) return 0

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoneyDigits(value: string): string {
  if (!value) return ''
  const numeric = parseMoneyDigits(value)
  if (!Number.isFinite(numeric)) return ''
  return numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatMoneyNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcRealReturn(bruto: number, ir: number, inflacao: number): number {
  const netNominal = bruto * (1 - ir / 100)
  const real = ((1 + netNominal / 100) / (1 + inflacao / 100) - 1) * 100
  return parseFloat(Math.max(0, real).toFixed(2))
}

const INITIAL_REAL_RETURN = calcRealReturn(12, 15, 4.5) // ≈ 5.46% a.a.

const DEFAULTS: UserInputs = {
  rendaMensal: 0,
  idadeAtual: 0,
  idadeAposentadoria: 0,
  patrimonioAtual: 0,
  rentabilidadeAcumulacao: 6,
  rentabilidadeRetirada: INITIAL_REAL_RETURN,
  expectativaVida: 85,
}

export default function InputForm({ onChange }: Props) {
  const [inputs, setInputs] = useState<UserInputs>(DEFAULTS)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [rendaMensalStr, setRendaMensalStr] = useState('')
  const [patrimonioStr, setPatrimonioStr] = useState('')

  const [rendBruto, setRendBruto] = useState(12)
  const [aliquotaIR, setAliquotaIR] = useState(15)
  const [inflacaoEst, setInflacaoEst] = useState(4.5)

  const realComputado = calcRealReturn(rendBruto, aliquotaIR, inflacaoEst)

  function update<K extends keyof UserInputs>(key: K, value: UserInputs[K]) {
    const next = { ...inputs, [key]: value }
    setInputs(next)
    onChange(next)
  }

  function handleBrutoField(field: 'bruto' | 'ir' | 'inflacao', value: number) {
    const b = field === 'bruto' ? value : rendBruto
    const ir = field === 'ir' ? value : aliquotaIR
    const inf = field === 'inflacao' ? value : inflacaoEst
    if (field === 'bruto') setRendBruto(value)
    if (field === 'ir') setAliquotaIR(value)
    if (field === 'inflacao') setInflacaoEst(value)
    const real = calcRealReturn(b, ir, inf)
    const next = { ...inputs, rentabilidadeAcumulacao: real, rentabilidadeRetirada: real }
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
            value={rendaMensalStr}
            onChange={e => {
              const next = formatMoneyDigits(e.target.value.replace(/[^\d,.-]/g, ''))
              setRendaMensalStr(next)
              update('rendaMensal', parseMoneyDigits(next))
            }}
            onBlur={() => setRendaMensalStr(inputs.rendaMensal > 0 ? formatMoneyDigits(String(inputs.rendaMensal)) : '')}
          />
        </div>
      </label>

      <div className="flex gap-3">
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-sm font-medium text-gray-600">Idade atual</span>
          <input
            type="number"
            min={1} max={70}
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
            value={patrimonioStr}
            onChange={e => {
              const next = e.target.value.replace(/[^\d,.-]/g, '')
              setPatrimonioStr(next)
              update('patrimonioAtual', parseMoneyDigits(next))
            }}
            onBlur={() => setPatrimonioStr(formatMoneyNumber(inputs.patrimonioAtual))}
          />
        </div>
      </label>

      <div className="relative flex items-center">
        <div className="flex-1 border-t border-gray-200"></div>
        <button
          type="button"
          className="mx-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-white px-1 transition-colors"
          onClick={() => setShowAdvanced(v => !v)}
        >
          <span className="text-[10px]">{showAdvanced ? '▼' : '▶'}</span>
          Alterar Rentabilidade
        </button>
        <div className="flex-1 border-t border-gray-200"></div>
      </div>

      {showAdvanced && (
        <div className="flex flex-col gap-4 border-t border-gray-100 pt-3">

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-600">Rentabilidade dos investimentos</span>
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 flex flex-col gap-3">

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-600">Rendimento nominal bruto (% a.a.)</span>
                <input
                  type="number"
                  step={0.1} min={0} max={50}
                  className="border border-indigo-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                  value={rendBruto}
                  onChange={e => handleBrutoField('bruto', parseFloat(e.target.value) || 0)}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-600">Alíquota de IR (%)</span>
                <input
                  type="number"
                  step={0.5} min={0} max={27.5}
                  className="border border-indigo-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                  value={aliquotaIR}
                  onChange={e => handleBrutoField('ir', parseFloat(e.target.value) || 0)}
                />
                <span className="text-[10px] text-gray-400">15% para aplicações acima de 2 anos · 0% para LCI/LCA</span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-600">Inflação estimada (% a.a.)</span>
                <input
                  type="number"
                  step={0.1} min={0} max={30}
                  className="border border-indigo-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                  value={inflacaoEst}
                  onChange={e => handleBrutoField('inflacao', parseFloat(e.target.value) || 0)}
                />
              </label>

              <div className="flex items-center justify-between bg-white rounded-lg border border-indigo-200 px-3 py-2">
                <span className="text-xs text-gray-500">Rentabilidade real resultante:</span>
                <span className="text-sm font-bold text-indigo-700">{realComputado.toFixed(2)}% a.a.</span>
              </div>

            </div>
          </div>

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

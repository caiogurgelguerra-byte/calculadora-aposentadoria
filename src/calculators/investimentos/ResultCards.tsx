import { formatCurrency } from '../../lib/investimentos/format'
import type { CalculationResult } from '../../lib/investimentos/types'

interface Props {
  result: CalculationResult
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR')
}

export default function ResultCards({ result }: Props) {
  const custom = result.rows.find((row) => row.id === 'custom')
  if (!custom) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
      <div className="md:col-span-2 xl:col-span-1 bg-blue-900 text-white rounded-xl p-5 shadow-sm">
        <p className="text-xs text-blue-200 uppercase tracking-wide">Valor liquido no resgate</p>
        <p className="text-2xl font-bold mt-2">{formatCurrency(custom.netFinalValue)}</p>
        <p className="text-xs text-blue-200 mt-2">Data-base: {formatDate(result.baseDate)}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Quanto voce colocou</p>
        <p className="text-xl font-semibold text-slate-800 mt-2">{formatCurrency(custom.investedTotal)}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Rendimento bruto</p>
        <p className="text-xl font-semibold text-emerald-700 mt-2">{formatCurrency(custom.grossYield)}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Imposto estimado</p>
        <p className="text-xl font-semibold text-slate-800 mt-2">{formatCurrency(custom.tax)}</p>
        <p className="text-xs text-gray-500 mt-1">Cobrado apenas no resgate final.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Rendimento liquido</p>
        <p className="text-xl font-semibold text-slate-800 mt-2">{formatCurrency(custom.netYield)}</p>
      </div>

      {result.realGainEstimate !== undefined ? (
        <div className="md:col-span-2 xl:col-span-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-emerald-800">Ganho real estimado</p>
          <p className="text-sm text-emerald-700 mt-1">
            {formatCurrency(result.realGainEstimate)} acima da inflacao informada.
          </p>
        </div>
      ) : null}

      {result.warnings.map((warning) => (
        <div
          key={warning}
          className="md:col-span-2 xl:col-span-4 bg-amber-50 border border-amber-100 rounded-xl p-4"
        >
          <p className="text-sm text-amber-800">{warning}</p>
        </div>
      ))}
    </div>
  )
}

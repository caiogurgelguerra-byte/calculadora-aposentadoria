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
      <div className="md:col-span-2 xl:col-span-1 rounded-lg border border-slate-900 bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">Valor líquido no resgate</p>
        <p className="mt-2 text-2xl font-semibold">{formatCurrency(custom.netFinalValue)}</p>
        <p className="mt-2 text-xs text-slate-300">Data-base: {formatDate(result.baseDate)}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Quanto você colocou</p>
        <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(custom.investedTotal)}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Rendimento bruto</p>
        <p className="mt-2 text-xl font-semibold text-emerald-700">{formatCurrency(custom.grossYield)}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Imposto estimado</p>
        <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(custom.tax)}</p>
        <p className="mt-1 text-xs text-slate-500">Cobrado apenas no resgate final.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Rendimento líquido</p>
        <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(custom.netYield)}</p>
      </div>

      {result.realGainEstimate !== undefined ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 md:col-span-2 xl:col-span-4">
          <p className="text-sm font-semibold text-emerald-800">Ganho real estimado</p>
          <p className="text-sm text-emerald-700 mt-1">
            {formatCurrency(result.realGainEstimate)} acima da inflação informada.
          </p>
        </div>
      ) : null}

      {result.warnings.map((warning) => (
        <div
          key={warning}
          className="rounded-lg border border-amber-100 bg-amber-50 p-4 md:col-span-2 xl:col-span-4"
        >
          <p className="text-sm text-amber-800">{warning}</p>
        </div>
      ))}
    </div>
  )
}

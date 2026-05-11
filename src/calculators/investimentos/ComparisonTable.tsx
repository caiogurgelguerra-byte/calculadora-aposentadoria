import { formatCurrency } from '../../lib/investimentos/format'
import type { ComparisonResult } from '../../lib/investimentos/types'

interface Props {
  rows: ComparisonResult[]
}

function formatSignedCurrency(value: number): string {
  const abs = Math.abs(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (value > 0) return `+ ${abs}`
  if (value < 0) return `- ${abs}`
  return abs
}

export default function ComparisonTable({ rows }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <caption className="sr-only">Comparativo liquido final dos investimentos</caption>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Alternativa</th>
              <th className="text-right font-semibold px-4 py-3">Valor bruto</th>
              <th className="text-right font-semibold px-4 py-3">Imposto</th>
              <th className="text-right font-semibold px-4 py-3">Valor liquido</th>
              <th className="text-right font-semibold px-4 py-3">Dif. liquida vs seu investimento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                data-testid={`comparison-row-${row.id}`}
                className={row.isBest ? 'bg-emerald-50/60' : undefined}
              >
                <td className="px-4 py-3 font-medium text-slate-700">
                  {row.label}
                  {row.isBest ? (
                    <span className="ml-2 text-xs text-emerald-700 font-semibold">Melhor resultado</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.grossFinalValue)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.tax)}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(row.netFinalValue)}</td>
                <td
                  className={`px-4 py-3 text-right ${
                    row.netDifferenceFromCustom > 0
                      ? 'text-emerald-700'
                      : row.netDifferenceFromCustom < 0
                        ? 'text-rose-700'
                        : 'text-slate-600'
                  }`}
                >
                  {formatSignedCurrency(row.netDifferenceFromCustom)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { formatCurrency } from '../../lib/investimentos/format'
import type { ComparisonResult } from '../../lib/investimentos/types'

interface Props {
  rows: ComparisonResult[]
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
              <th className="text-right font-semibold px-4 py-3">Diferenca liquida</th>
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
                <td className="px-4 py-3 text-right text-slate-600">
                  {formatCurrency(row.netDifferenceFromCustom)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

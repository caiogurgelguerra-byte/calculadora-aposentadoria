import type { ComparativoRow } from '../../lib/salario/types'

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  rows: ComparativoRow[]
}

export default function ComparisonTable({ rows }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Comparativo por faixa salarial</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 font-medium text-gray-500">Bruto</th>
              <th className="text-right py-2 font-medium text-gray-500">INSS</th>
              <th className="text-right py-2 font-medium text-gray-500">IR</th>
              <th className="text-right py-2 font-medium text-gray-500">Líquido</th>
              <th className="text-right py-2 font-medium text-gray-500">% Desc.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.bruto}
                className={`border-b border-gray-50 ${
                  row.isCurrentSalary ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'
                }`}
              >
                <td className="py-2 text-gray-800">{fmt(row.bruto)}</td>
                <td className="py-2 text-right text-red-500">{fmt(row.inss)}</td>
                <td className="py-2 text-right text-red-500">{fmt(row.irrf)}</td>
                <td className="py-2 text-right text-blue-700 font-medium">{fmt(row.liquido)}</td>
                <td className="py-2 text-right text-gray-600">{row.percentualDesconto.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

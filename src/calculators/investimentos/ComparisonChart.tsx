import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '../../lib/investimentos/format'
import type { ComparisonResult, SimulationPoint } from '../../lib/investimentos/types'

interface Props {
  simulation: SimulationPoint[]
  rows: ComparisonResult[]
}

function compactCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return formatCurrency(value)
}

export default function ComparisonChart({ simulation, rows }: Props) {
  const finalRows = rows.map((row) => `${row.label}: ${formatCurrency(row.netFinalValue)}`).join(' | ')

  return (
    <section
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
      aria-labelledby="investment-chart-title"
    >
      <h3 id="investment-chart-title" className="text-sm font-semibold text-gray-700">
        Evolucao bruta mes a mes
      </h3>
      <p className="text-xs text-gray-500 mt-1">
        O grafico mostra valores brutos ao longo do tempo. A decisao final deve usar o valor liquido da tabela.
      </p>
      <p className="sr-only" data-testid="chart-summary">
        Valores liquidos finais: {finalRows}
      </p>

      <div className="h-72 sm:h-80 mt-4" data-testid="investment-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={simulation} margin={{ top: 4, right: 16, left: 8, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tickFormatter={compactCurrency} tick={{ fontSize: 10, fill: '#94a3b8' }} width={72} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Mes ${label}`}
              contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="customGross"
              name="Seu investimento"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="savingsGross"
              name="Poupanca simplificada"
              stroke="#64748b"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="cdb100CdiGross"
              name="CDB 100% CDI"
              stroke="#059669"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="lciLca85CdiGross"
              name="LCI/LCA hipotetica 85% CDI"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { SimulationDataPoint } from '../lib/types'

interface Props {
  simulacao: SimulationDataPoint[]
  idadeAposentadoria: number
}

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ProjectionChart({ simulacao, idadeAposentadoria }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">Projeção do patrimônio</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={simulacao} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="idade" label={{ value: 'Idade', position: 'insideBottom', offset: -2 }} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: 10 }} width={72} />
          <Tooltip
            formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            labelFormatter={(label) => `Idade: ${label}`}
          />
          <Legend verticalAlign="top" height={28} />
          <ReferenceLine x={idadeAposentadoria} stroke="#9ca3af" strokeDasharray="6 3" label={{ value: 'Aposentadoria', fontSize: 10, fill: '#6b7280' }} />
          <Line type="monotone" dataKey="cenarioA" name="A — Perpétua" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={false} />
          <Line type="monotone" dataKey="cenarioB" name="B — 90 anos"  stroke="#22c55e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="cenarioC" name="C — Expect. vida" stroke="#f97316" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

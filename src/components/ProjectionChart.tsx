import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Projeção do patrimônio</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={simulacao} margin={{ top: 4, right: 16, left: 8, bottom: 20 }}>
          <defs>
            <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="idade"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            label={{ value: 'Idade', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#94a3b8' }}
          />
          <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: 10, fill: '#94a3b8' }} width={72} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)', fontSize: 12 }}
            formatter={(value: number, name: string) => [
              value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              name,
            ]}
            labelFormatter={(label) => `Idade: ${label} anos`}
          />
          <Legend verticalAlign="top" height={32} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine
            x={idadeAposentadoria}
            stroke="#cbd5e1"
            strokeDasharray="6 3"
            label={{ value: 'Aposentadoria', fontSize: 10, fill: '#94a3b8', position: 'insideTopRight' }}
          />
          <Area type="monotone" dataKey="cenarioA" name="A — Perpétua"      stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradA)" dot={false} connectNulls={false} />
          <Area type="monotone" dataKey="cenarioB" name="B — 90 anos"       stroke="#10b981" strokeWidth={2.5} fill="url(#gradB)" dot={false} />
          <Area type="monotone" dataKey="cenarioC" name="C — Expect. vida"  stroke="#f97316" strokeWidth={2.5} fill="url(#gradC)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

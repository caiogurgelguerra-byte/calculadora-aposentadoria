import type { SimulationDataPoint, CalculationResults, UserInputs } from '../lib/types'

interface Props {
  simulacao: SimulationDataPoint[]
  selectedScenario: 'A' | 'B' | 'C'
  results: CalculationResults
  inputs: UserInputs
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const HEADER_COLOR = { A: 'text-blue-600', B: 'text-emerald-600', C: 'text-orange-600' }

export default function SummaryTable({ simulacao, selectedScenario, results, inputs }: Props) {
  const scenario = results[`cenario${selectedScenario}` as 'cenarioA' | 'cenarioB' | 'cenarioC']
  const cenarioANull = selectedScenario === 'A' && simulacao.length > 0 && simulacao[0].cenarioA === null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className={`text-sm font-semibold mb-1 ${HEADER_COLOR[selectedScenario]}`}>
        Projeção anual — Cenário {selectedScenario}: {scenario.nome}
      </h3>
      <p className="text-xs text-gray-400 mb-3">Patrimônio projetado ao final de cada ano</p>

      <div className="overflow-y-auto max-h-64 rounded-lg border border-gray-100">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-2 px-3 text-gray-500 font-semibold">Idade</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold">Patrimônio</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold">Aporte Mensal</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold">Saque Mensal</th>
            </tr>
          </thead>
          <tbody>
            {simulacao.map((ponto) => {
              const isWithdrawal = ponto.idade >= inputs.idadeAposentadoria
              const patrimonioVal = ponto[`cenario${selectedScenario}` as 'cenarioA' | 'cenarioB' | 'cenarioC']

              const patrimonioStr = cenarioANull ? '—' : fmt(patrimonioVal as number)
              const aporteStr = cenarioANull ? '—' : isWithdrawal ? '—' : fmt(scenario.aporteMensal)
              const saqueStr = cenarioANull
                ? (isWithdrawal ? fmt(inputs.rendaMensal) : '—')
                : isWithdrawal ? fmt(inputs.rendaMensal) : '—'

              return (
                <tr
                  key={ponto.idade}
                  className={`border-b border-gray-50 transition-colors
                    ${isWithdrawal
                      ? 'bg-red-50/40 hover:bg-red-50'
                      : 'bg-emerald-50/30 hover:bg-emerald-50/60'
                    }`}
                >
                  <td className="py-1.5 px-3 font-semibold text-gray-700">{ponto.idade}</td>
                  <td className="py-1.5 px-3 text-right text-gray-700 font-medium">{patrimonioStr}</td>
                  <td className={`py-1.5 px-3 text-right ${isWithdrawal ? 'text-gray-300' : 'text-emerald-600'}`}>{aporteStr}</td>
                  <td className={`py-1.5 px-3 text-right ${isWithdrawal ? 'text-red-500' : 'text-gray-300'}`}>{saqueStr}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-5 mt-3 pt-2 border-t border-gray-100">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300 inline-block"></span>
          Acumulação
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block"></span>
          Resgate
        </span>
      </div>
    </div>
  )
}

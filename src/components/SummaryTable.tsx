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

const HEADER_COLOR = { A: 'text-blue-600', B: 'text-green-600', C: 'text-orange-600' }

export default function SummaryTable({ simulacao, selectedScenario, results, inputs }: Props) {
  const scenario = results[`cenario${selectedScenario}` as 'cenarioA' | 'cenarioB' | 'cenarioC']
  const cenarioANull = selectedScenario === 'A' && simulacao.length > 0 && simulacao[0].cenarioA === null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className={`text-sm font-semibold mb-3 ${HEADER_COLOR[selectedScenario]}`}>
        Projeção anual — Cenário {selectedScenario}: {scenario.nome}
      </h3>
      <div className="overflow-y-auto max-h-64">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-gray-200">
              <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Idade</th>
              <th className="text-right py-1.5 px-2 text-gray-500 font-medium">Patrimônio</th>
              <th className="text-right py-1.5 px-2 text-gray-500 font-medium">Aporte Mensal</th>
              <th className="text-right py-1.5 px-2 text-gray-500 font-medium">Saque Mensal</th>
            </tr>
          </thead>
          <tbody>
            {simulacao.map((ponto) => {
              const isWithdrawal = ponto.idade >= inputs.idadeAposentadoria
              const patrimonioVal = ponto[`cenario${selectedScenario}` as 'cenarioA' | 'cenarioB' | 'cenarioC']

              const patrimonioStr = cenarioANull ? '—' : fmt(patrimonioVal as number)
              const aporteStr = cenarioANull ? '—' : isWithdrawal ? fmt(0) : fmt(scenario.aporteMensal)
              const saqueStr = cenarioANull
                ? (isWithdrawal ? fmt(inputs.rendaMensal) : '—')
                : isWithdrawal ? fmt(inputs.rendaMensal) : fmt(0)

              return (
                <tr key={ponto.idade} className={`border-b border-gray-50 ${isWithdrawal ? 'bg-red-50/30' : ''}`}>
                  <td className="py-1 px-2 font-medium text-gray-700">{ponto.idade}</td>
                  <td className="py-1 px-2 text-right text-gray-700">{patrimonioStr}</td>
                  <td className="py-1 px-2 text-right text-gray-500">{aporteStr}</td>
                  <td className="py-1 px-2 text-right text-gray-500">{saqueStr}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

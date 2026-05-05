import { useState, useCallback } from 'react'
import type { UserInputs } from './lib/types'
import { useCalculations } from './hooks/useCalculations'
import InputForm from './components/InputForm'
import ScenarioCards from './components/ScenarioCards'
import ProjectionChart from './components/ProjectionChart'
import SummaryTable from './components/SummaryTable'

const DEFAULT_INPUTS: UserInputs = {
  rendaMensal: 0,
  idadeAtual: 0,
  idadeAposentadoria: 0,
  patrimonioAtual: 0,
  rentabilidadeAcumulacao: 6,
  rentabilidadeRetirada: 4,
  expectativaVida: 85,
}

export default function App() {
  const [inputs, setInputs] = useState<UserInputs>(DEFAULT_INPUTS)
  const [selectedScenario, setSelectedScenario] = useState<'A' | 'B' | 'C'>('A')
  const results = useCalculations(inputs)

  const handleInputChange = useCallback((next: UserInputs) => {
    setInputs(next)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800">Calculadora de Aposentadoria</h1>
        <p className="text-sm text-gray-500 mt-0.5">Todos os valores em termos reais (já descontada a inflação)</p>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column — inputs */}
          <div className="lg:w-80 shrink-0">
            <InputForm onChange={handleInputChange} />
          </div>

          {/* Right column — results */}
          <div className="flex-1 flex flex-col gap-4">
            {results ? (
              <>
                <ScenarioCards
                  results={results}
                  selectedScenario={selectedScenario}
                  onSelectScenario={setSelectedScenario}
                />
                <ProjectionChart
                  simulacao={results.simulacao}
                  idadeAposentadoria={inputs.idadeAposentadoria}
                />
                <SummaryTable
                  simulacao={results.simulacao}
                  selectedScenario={selectedScenario}
                  results={results}
                  inputs={inputs}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                <div className="text-center">
                  <p className="text-lg font-medium">Preencha seus dados</p>
                  <p className="text-sm mt-1">Os resultados aparecerão aqui</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

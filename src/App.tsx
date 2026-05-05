import { useState, useCallback } from 'react'
import type { UserInputs } from './lib/types'
import { useCalculations } from './hooks/useCalculations'
import InputForm from './components/InputForm'
import ScenarioCards from './components/ScenarioCards'
import ProjectionChart from './components/ProjectionChart'
import SummaryTable from './components/SummaryTable'
import ExplanationBox from './components/ExplanationBox'

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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-blue-900 to-indigo-700 px-6 py-5 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">Calculadora de Aposentadoria</h1>
          <p className="text-sm text-blue-200 mt-1">Valores em termos reais · inflação já descontada</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-80 shrink-0">
            <InputForm onChange={handleInputChange} />
          </div>

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
                <ExplanationBox
                  results={results}
                  inputs={inputs}
                  selectedScenario={selectedScenario}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-slate-200 bg-white text-slate-400">
                <div className="text-center">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-base font-semibold text-slate-500">Preencha seus dados</p>
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

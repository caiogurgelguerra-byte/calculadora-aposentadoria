export interface UserInputs {
  rendaMensal: number
  idadeAtual: number
  idadeAposentadoria: number
  patrimonioAtual: number
  rentabilidadeAcumulacao: number // % a.a. real
  rentabilidadeRetirada: number   // % a.a. real
  expectativaVida: number
}

export interface ScenarioResult {
  nome: string
  capitalNecessario: number
  aporteMensal: number
  metaJaAtingida: boolean
}

export interface SimulationDataPoint {
  idade: number
  cenarioA: number | null // null only when r_ret = 0
  cenarioB: number
  cenarioC: number
}

export interface CalculationResults {
  cenarioA: ScenarioResult
  cenarioB: ScenarioResult
  cenarioC: ScenarioResult
  simulacao: SimulationDataPoint[]
}

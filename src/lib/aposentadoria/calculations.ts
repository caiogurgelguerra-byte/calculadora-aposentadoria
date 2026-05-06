import type { ScenarioResult, SimulationDataPoint, UserInputs } from './types'

export function monthlyRate(annualPct: number): number {
  if (annualPct === 0) return 0
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1
}

export function capitalPerpetuidade(rendaMensal: number, rRet: number): number | null {
  if (rRet === 0) return null
  return rendaMensal / rRet
}

export function capitalAnnuity(rendaMensal: number, rRet: number, nMonths: number): number {
  if (rRet === 0) return rendaMensal * nMonths
  return rendaMensal * ((1 - Math.pow(1 + rRet, -nMonths)) / rRet)
}

export function calcPMT(
  capitalNecessario: number,
  patrimonioAtual: number,
  rAc: number,
  nAc: number
): { aporteMensal: number; metaJaAtingida: boolean } {
  if (nAc <= 0) return { aporteMensal: 0, metaJaAtingida: true }
  const fvPatrimonio = patrimonioAtual * Math.pow(1 + rAc, nAc)
  if (fvPatrimonio >= capitalNecessario) {
    return { aporteMensal: 0, metaJaAtingida: true }
  }
  const gap = capitalNecessario - fvPatrimonio
  const pmt =
    rAc === 0
      ? gap / nAc
      : (gap * rAc) / (Math.pow(1 + rAc, nAc) - 1)
  return { aporteMensal: Math.max(0, pmt), metaJaAtingida: false }
}

function stepAccumulation(patrimonio: number, pmt: number, rAc: number): number {
  if (rAc === 0) return patrimonio + pmt * 12
  const factor = Math.pow(1 + rAc, 12)
  return patrimonio * factor + pmt * ((factor - 1) / rAc)
}

function stepWithdrawal(patrimonio: number, rendaMensal: number, rRet: number): number {
  if (rRet === 0) return Math.max(0, patrimonio - rendaMensal * 12)
  const factor = Math.pow(1 + rRet, 12)
  return Math.max(0, patrimonio * factor - rendaMensal * ((factor - 1) / rRet))
}

export function buildSimulation(
  scenarioA: ScenarioResult,
  scenarioB: ScenarioResult,
  scenarioC: ScenarioResult,
  inputs: UserInputs,
  cenarioAUndefined: boolean
): SimulationDataPoint[] {
  const { rendaMensal, idadeAtual, idadeAposentadoria, patrimonioAtual,
          rentabilidadeAcumulacao, rentabilidadeRetirada, expectativaVida } = inputs
  const rAc = monthlyRate(rentabilidadeAcumulacao)
  const rRet = monthlyRate(rentabilidadeRetirada)
  const endAge = Math.max(90, expectativaVida)
  const points: SimulationDataPoint[] = []

  let patA = patrimonioAtual
  let patB = patrimonioAtual
  let patC = patrimonioAtual

  for (let age = idadeAtual; age <= endAge; age++) {
    points.push({
      idade: age,
      cenarioA: cenarioAUndefined ? null : patA,
      cenarioB: patB,
      cenarioC: patC,
    })
    if (age < idadeAposentadoria) {
      if (!cenarioAUndefined) patA = stepAccumulation(patA, scenarioA.aporteMensal, rAc)
      patB = stepAccumulation(patB, scenarioB.aporteMensal, rAc)
      patC = stepAccumulation(patC, scenarioC.aporteMensal, rAc)
    } else {
      if (!cenarioAUndefined) patA = stepWithdrawal(patA, rendaMensal, rRet)
      patB = stepWithdrawal(patB, rendaMensal, rRet)
      patC = stepWithdrawal(patC, rendaMensal, rRet)
    }
  }

  return points
}

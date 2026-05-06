import { useMemo } from 'react'
import type { UserInputs, CalculationResults, ScenarioResult } from '../../lib/aposentadoria/types'
import {
  monthlyRate,
  capitalPerpetuidade,
  capitalAnnuity,
  calcPMT,
  buildSimulation,
} from '../../lib/aposentadoria/calculations'

function isValid(inputs: UserInputs): boolean {
  const { rendaMensal, idadeAtual, idadeAposentadoria, expectativaVida } = inputs
  return (
    rendaMensal > 0 &&
    idadeAtual >= 1 && idadeAtual <= 70 &&
    idadeAposentadoria > idadeAtual && idadeAposentadoria <= 80 &&
    expectativaVida > idadeAposentadoria
  )
}

export function useCalculations(inputs: UserInputs): CalculationResults | null {
  return useMemo(() => {
    if (!isValid(inputs)) return null

    const { rendaMensal, idadeAtual, idadeAposentadoria, patrimonioAtual,
            rentabilidadeAcumulacao, rentabilidadeRetirada, expectativaVida } = inputs

    const rAc  = monthlyRate(rentabilidadeAcumulacao)
    const rRet = monthlyRate(rentabilidadeRetirada)
    const nAc  = (idadeAposentadoria - idadeAtual) * 12

    const capAOrNull = capitalPerpetuidade(rendaMensal, rRet)
    const cenarioAUndefined = capAOrNull === null
    const capA = capAOrNull ?? 0

    const nB = (90 - idadeAposentadoria) * 12
    const capB = capitalAnnuity(rendaMensal, rRet, nB)

    const nC = (expectativaVida - idadeAposentadoria) * 12
    const capC = capitalAnnuity(rendaMensal, rRet, nC)

    const pmtA = cenarioAUndefined
      ? { aporteMensal: 0, metaJaAtingida: false }
      : calcPMT(capA, patrimonioAtual, rAc, nAc)
    const pmtB = calcPMT(capB, patrimonioAtual, rAc, nAc)
    const pmtC = calcPMT(capC, patrimonioAtual, rAc, nAc)

    const cenarioA: ScenarioResult = {
      nome: 'Renda Perpétua',
      capitalNecessario: capA,
      aporteMensal: pmtA.aporteMensal,
      metaJaAtingida: pmtA.metaJaAtingida,
    }
    const cenarioB: ScenarioResult = {
      nome: 'Período Fixo (90 anos)',
      capitalNecessario: capB,
      aporteMensal: pmtB.aporteMensal,
      metaJaAtingida: pmtB.metaJaAtingida,
    }
    const cenarioC: ScenarioResult = {
      nome: `Expectativa de Vida (${expectativaVida} anos)`,
      capitalNecessario: capC,
      aporteMensal: pmtC.aporteMensal,
      metaJaAtingida: pmtC.metaJaAtingida,
    }

    const simulacao = buildSimulation(cenarioA, cenarioB, cenarioC, inputs, cenarioAUndefined)

    return { cenarioA, cenarioB, cenarioC, simulacao }
  }, [inputs])
}

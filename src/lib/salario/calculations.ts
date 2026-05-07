import type { SalarioResult, DecimoResult, ComparativoRow } from './types'
import {
  INSS_BRACKETS, IRRF_BRACKETS, DEDUCAO_DEPENDENTE,
  ISENCAO_IR_GROSS_LIMIT, REDUTOR_IR_GROSS_LIMIT,
  JORNADA_MENSAL_PADRAO, ADICIONAL_HE_50, ADICIONAL_HE_100,
  COMPARISON_BRACKETS,
} from './taxTables'

function aplicaReformaIR(bruto: number, irrfPleno: number): number {
  if (bruto <= ISENCAO_IR_GROSS_LIMIT) return 0
  if (bruto >= REDUTOR_IR_GROSS_LIMIT) return irrfPleno
  const factor = (bruto - ISENCAO_IR_GROSS_LIMIT) / (REDUTOR_IR_GROSS_LIMIT - ISENCAO_IR_GROSS_LIMIT)
  return Math.round(irrfPleno * factor * 100) / 100
}

export function calcValorHorasExtras(salarioBruto: number, h50: number, h100: number): number {
  if (salarioBruto <= 0) return 0
  const valorHora = salarioBruto / JORNADA_MENSAL_PADRAO
  const v50 = Math.round(valorHora * ADICIONAL_HE_50 * h50 * 100) / 100
  const v100 = Math.round(valorHora * ADICIONAL_HE_100 * h100 * 100) / 100
  return Math.round((v50 + v100) * 100) / 100
}

export interface SalarioCalcOptions {
  outrosDescontos?: number
  beneficios?: number
  horasExtras50?: number
  horasExtras100?: number
}

const TETO_INSS = INSS_BRACKETS[INSS_BRACKETS.length - 1].limite

export function calcINSS(bruto: number): number {
  const base = Math.min(bruto, TETO_INSS)
  let prev = 0
  let total = 0
  for (const { limite, aliquota } of INSS_BRACKETS) {
    if (base <= prev) break
    const topo = Math.min(base, limite)
    total += Math.round((topo - prev) * aliquota * 100) / 100
    prev = limite
    if (base <= limite) break
  }
  return Math.round(total * 100) / 100
}

export function calcIRRF(base: number): number {
  const bracket = IRRF_BRACKETS.find(b => base <= b.limite) ?? IRRF_BRACKETS[IRRF_BRACKETS.length - 1]
  const irrf = base * bracket.aliquota - bracket.parcela
  return Math.max(0, Math.round(irrf * 100) / 100)
}

export function calcSalarioLiquido(bruto: number, dependentes: number, opts?: SalarioCalcOptions): SalarioResult {
  const horasExtras50 = opts?.horasExtras50 ?? 0
  const horasExtras100 = opts?.horasExtras100 ?? 0
  const outrosDescontos = opts?.outrosDescontos ?? 0
  const beneficios = opts?.beneficios ?? 0

  const valorHE = calcValorHorasExtras(bruto, horasExtras50, horasExtras100)
  const brutoTotal = Math.round((bruto + valorHE) * 100) / 100

  const inss = calcINSS(brutoTotal)
  const deducaoDependentes = dependentes * DEDUCAO_DEPENDENTE
  const baseIRRF = Math.max(0, Math.round((brutoTotal - inss - deducaoDependentes) * 100) / 100)
  const irrf = aplicaReformaIR(brutoTotal, calcIRRF(baseIRRF))
  const liquido = Math.round((brutoTotal - inss - irrf - outrosDescontos + beneficios) * 100) / 100
  return { bruto, valorHE, brutoTotal, inss, baseIRRF, irrf, outrosDescontos, beneficios, liquido }
}

export function calcDecimo(bruto: number): DecimoResult {
  const inss = calcINSS(bruto)
  const base = Math.max(0, Math.round((bruto - inss) * 100) / 100)
  const irrf = aplicaReformaIR(bruto, calcIRRF(base))
  const liquido = Math.round((bruto - inss - irrf) * 100) / 100
  return { bruto, inss, irrf, liquido }
}

function buildComparisonBrackets(salarioAtual: number): number[] {
  const result = new Set<number>(COMPARISON_BRACKETS)
  if (salarioAtual > 0) result.add(salarioAtual)
  const maxBase = COMPARISON_BRACKETS[COMPARISON_BRACKETS.length - 1]
  if (salarioAtual > maxBase) {
    for (let v = 30000; v < salarioAtual; v += 10000) result.add(v)
  }
  return Array.from(result).sort((a, b) => a - b)
}

export function calcComparativo(salarioAtual: number, dependentes: number): ComparativoRow[] {
  return buildComparisonBrackets(salarioAtual).map(bruto => {
    const r = calcSalarioLiquido(bruto, dependentes)
    const totalDesconto = r.inss + r.irrf
    const percentualDesconto = bruto > 0
      ? Math.round((totalDesconto / bruto) * 10000) / 100
      : 0
    return {
      bruto: r.bruto,
      inss: r.inss,
      irrf: r.irrf,
      liquido: r.liquido,
      percentualDesconto,
      isCurrentSalary: bruto === salarioAtual,
    }
  })
}

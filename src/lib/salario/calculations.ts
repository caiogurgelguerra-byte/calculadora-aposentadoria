import type { SalarioResult, DecimoResult, ComparativoRow } from './types'
import { INSS_BRACKETS, IRRF_BRACKETS, DEDUCAO_DEPENDENTE, COMPARISON_BRACKETS } from './taxTables'

export function calcINSS(bruto: number): number {
  const base = Math.min(bruto, 8157.41)
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

export function calcSalarioLiquido(bruto: number, dependentes: number): SalarioResult {
  const inss = calcINSS(bruto)
  const deducaoDependentes = dependentes * DEDUCAO_DEPENDENTE
  const baseIRRF = Math.max(0, Math.round((bruto - inss - deducaoDependentes) * 100) / 100)
  const irrf = calcIRRF(baseIRRF)
  const liquido = Math.round((bruto - inss - irrf) * 100) / 100
  return { bruto, inss, baseIRRF, irrf, liquido }
}

export function calcDecimo(bruto: number): DecimoResult {
  const inss = calcINSS(bruto)
  const base = Math.max(0, Math.round((bruto - inss) * 100) / 100)
  const irrf = calcIRRF(base)
  const liquido = Math.round((bruto - inss - irrf) * 100) / 100
  return { bruto, inss, irrf, liquido }
}

export function calcComparativo(salarioAtual: number, dependentes: number): ComparativoRow[] {
  return COMPARISON_BRACKETS.map(bruto => {
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

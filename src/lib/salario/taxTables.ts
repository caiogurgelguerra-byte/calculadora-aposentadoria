// INSS: tabela vigente (Portaria MF 2025).
// IRRF: tabela 2025 com a isenção da reforma vigente desde fev/2026 — salários
// brutos até R$5.000/mês não retêm IR na fonte. A isenção é aplicada no nível
// do cálculo de salário líquido (calcSalarioLiquido / calcDecimo), não na
// tabela em si — o app é para recebimento líquido mensal, não declaração de IR.

export const INSS_BRACKETS: Array<{ limite: number; aliquota: number }> = [
  { limite: 1518.00, aliquota: 0.075 },
  { limite: 2793.88, aliquota: 0.09  },
  { limite: 4190.83, aliquota: 0.12  },
  { limite: 8157.41, aliquota: 0.14  },
]

// Tabela progressiva com parcela dedutível (Receita Federal 2025).
// Nota: R$896,00 é o valor oficial publicado pela RFB (arredondado).
// No limite exato de R$4.664,68 pode ocorrer diferença de R$0,01 — esperado.
export const IRRF_BRACKETS: Array<{ limite: number; aliquota: number; parcela: number }> = [
  { limite: 2259.20,   aliquota: 0,     parcela: 0      },
  { limite: 2826.65,   aliquota: 0.075, parcela: 169.44 },
  { limite: 3751.05,   aliquota: 0.15,  parcela: 381.44 },
  { limite: 4664.68,   aliquota: 0.225, parcela: 662.77 },
  { limite: Infinity,  aliquota: 0.275, parcela: 896.00 },
]

export const DEDUCAO_DEPENDENTE = 189.59

// Reforma do IR vigente desde fev/2026:
// - Brutos ≤ R$5.000: isento (IR = 0)
// - Brutos entre R$5.000 e R$7.000: redutor linear — IR = IR_pleno × (bruto - 5000) / 2000
// - Brutos ≥ R$7.000: tabela 2025 normal, sem redutor
export const ISENCAO_IR_GROSS_LIMIT = 5000.00
export const REDUTOR_IR_GROSS_LIMIT = 7000.00

export const COMPARISON_BRACKETS = [1500, 2000, 3000, 5000, 8000, 10000, 15000, 20000]

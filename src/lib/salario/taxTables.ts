// ATENÇÃO: Atualizar estas tabelas quando sair a reforma do IR (prevista para 2026)
// A reforma isenta salários até R$5.000/mês e altera as faixas acima disso.

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

export const COMPARISON_BRACKETS = [1500, 2000, 3000, 5000, 8000, 10000, 15000, 20000]

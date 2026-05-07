import { describe, it, expect } from 'vitest'
import { calcINSS, calcIRRF, calcSalarioLiquido, calcDecimo, calcComparativo } from './calculations'

describe('calcINSS', () => {
  it('returns 0 for salary 0', () => {
    expect(calcINSS(0)).toBe(0)
  })
  it('applies first bracket only for salary R$1.000', () => {
    expect(calcINSS(1000)).toBe(75.00)
  })
  it('applies progressive brackets for salary R$5.000 (INSS 2026)', () => {
    expect(calcINSS(5000)).toBe(501.51)
  })
  it('returns ceiling R$988,09 for salary R$10.000 (above teto R$8.475,55 / 2026)', () => {
    expect(calcINSS(10000)).toBe(988.09)
  })
  it('ceiling R$988,09 also applies at R$20.000', () => {
    expect(calcINSS(20000)).toBe(988.09)
  })
})

describe('calcIRRF', () => {
  it('returns 0 for base at or below R$2.259,20', () => {
    expect(calcIRRF(0)).toBe(0)
    expect(calcIRRF(2259.20)).toBe(0)
  })
  it('applies 22.5% bracket for base R$4.490,41 (Exemplo 1)', () => {
    expect(calcIRRF(4490.41)).toBe(347.57)
  })
  it('applies 27.5% bracket for base R$9.048,37 (Exemplo 2)', () => {
    expect(calcIRRF(9048.37)).toBe(1592.30)
  })
})

describe('calcSalarioLiquido', () => {
  it('R$5.000 bruto isento (reforma fev/2026)', () => {
    const r = calcSalarioLiquido(5000, 0)
    expect(r.inss).toBe(501.51)
    expect(r.baseIRRF).toBe(4498.49)
    expect(r.irrf).toBe(0)
    expect(r.liquido).toBe(4498.49)
  })
  it('R$10.000 bruto, 0 dependentes — fora da isenção', () => {
    const r = calcSalarioLiquido(10000, 0)
    expect(r.inss).toBe(988.09)
    expect(r.baseIRRF).toBe(9011.91)
    expect(r.irrf).toBe(1582.28)
    expect(r.liquido).toBe(7429.63)
  })
  it('dependentes reduce baseIRRF by R$189,59 each', () => {
    const r = calcSalarioLiquido(5000, 2)
    expect(r.baseIRRF).toBeCloseTo(4498.49 - 2 * 189.59, 2)
  })
  it('returns 0 for salary 0', () => {
    const r = calcSalarioLiquido(0, 0)
    expect(r.inss).toBe(0)
    expect(r.irrf).toBe(0)
    expect(r.liquido).toBe(0)
  })
  it('R$5.000,01 bruto não tem cliff (IR ≈ 0 com redutor)', () => {
    const r = calcSalarioLiquido(5000.01, 0)
    expect(r.irrf).toBeLessThan(1)
  })
})

describe('Redutor IR R$5K–R$7K (reforma fev/2026)', () => {
  it('R$5.500 paga 25% do IR pleno', () => {
    // INSS 2026: 571.51; base 4928.49 (27,5%) → pleno 459.33; factor 0,25 → 114,83
    expect(calcSalarioLiquido(5500, 0).irrf).toBe(114.83)
  })
  it('R$6.000 paga 50% do IR pleno', () => {
    // INSS 2026: 641.51; base 5358.49 (27,5%) → pleno 577.58; factor 0,5 → 288,79
    expect(calcSalarioLiquido(6000, 0).irrf).toBe(288.79)
  })
  it('R$7.000 paga 100% do IR pleno (fim do redutor)', () => {
    // INSS 2026: 781.51; base 6218.49 (27,5%) → pleno 814.08; factor 1,0 → 814,08
    expect(calcSalarioLiquido(7000, 0).irrf).toBe(814.08)
  })
  it('R$7.000,01 também paga IR pleno (acima do redutor)', () => {
    const r = calcSalarioLiquido(7000.01, 0)
    expect(r.irrf).toBeGreaterThan(814)
  })
  it('IR cresce monotonicamente entre R$5K e R$7K', () => {
    const a = calcSalarioLiquido(5500, 0).irrf
    const b = calcSalarioLiquido(6000, 0).irrf
    const c = calcSalarioLiquido(6500, 0).irrf
    const d = calcSalarioLiquido(7000, 0).irrf
    expect(a).toBeLessThan(b)
    expect(b).toBeLessThan(c)
    expect(c).toBeLessThan(d)
  })
})

describe('calcDecimo', () => {
  it('isento quando bruto está na faixa da reforma (≤ R$5.000)', () => {
    const decimoResult = calcDecimo(5000)
    expect(decimoResult.inss).toBe(501.51)
    expect(decimoResult.irrf).toBe(0)
    expect(decimoResult.liquido).toBeCloseTo(5000 - 501.51, 2)
  })
  it('acima de R$7.000, 13th IRRF é maior que o mensal com dependentes (não deduz dependentes)', () => {
    const monthly = calcSalarioLiquido(10000, 2)
    const decimo = calcDecimo(10000)
    expect(decimo.irrf).toBeGreaterThan(monthly.irrf)
  })
})

describe('calcComparativo', () => {
  it('returns 8 rows for the 8 predefined salary brackets', () => {
    expect(calcComparativo(5000, 0)).toHaveLength(8)
  })
  it('marks the current salary row (R$5.000)', () => {
    const rows = calcComparativo(5000, 0)
    expect(rows.find(r => r.bruto === 5000)?.isCurrentSalary).toBe(true)
    expect(rows.find(r => r.bruto === 3000)?.isCurrentSalary).toBe(false)
  })
  it('R$5.000 row matches calcSalarioLiquido directly', () => {
    const row = calcComparativo(5000, 0).find(r => r.bruto === 5000)!
    const direct = calcSalarioLiquido(5000, 0)
    expect(row.inss).toBe(direct.inss)
    expect(row.irrf).toBe(direct.irrf)
    expect(row.liquido).toBe(direct.liquido)
  })
  it('percentualDesconto = (inss + irrf) / bruto × 100', () => {
    const row = calcComparativo(5000, 0).find(r => r.bruto === 5000)!
    const expected = ((row.inss + row.irrf) / 5000) * 100
    expect(row.percentualDesconto).toBeCloseTo(expected, 2)
  })
})

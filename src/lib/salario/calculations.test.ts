import { describe, it, expect } from 'vitest'
import { calcINSS, calcIRRF, calcSalarioLiquido, calcDecimo, calcComparativo } from './calculations'

describe('calcINSS', () => {
  it('returns 0 for salary 0', () => {
    expect(calcINSS(0)).toBe(0)
  })
  it('applies first bracket only for salary R$1.000', () => {
    expect(calcINSS(1000)).toBe(75.00)
  })
  it('applies progressive brackets for salary R$5.000 (Exemplo 1 do spec)', () => {
    expect(calcINSS(5000)).toBe(509.59)
  })
  it('returns ceiling R$951.63 for salary R$10.000 (above R$8.157,41)', () => {
    expect(calcINSS(10000)).toBe(951.63)
  })
  it('ceiling R$951.63 also applies at R$20.000', () => {
    expect(calcINSS(20000)).toBe(951.63)
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
  it('Exemplo 1: R$5.000 bruto isento (reforma fev/2026)', () => {
    const r = calcSalarioLiquido(5000, 0)
    expect(r.inss).toBe(509.59)
    expect(r.baseIRRF).toBe(4490.41)
    expect(r.irrf).toBe(0)
    expect(r.liquido).toBe(4490.41)
  })
  it('Exemplo 2: R$10.000 bruto, 0 dependentes — fora da isenção', () => {
    const r = calcSalarioLiquido(10000, 0)
    expect(r.inss).toBe(951.63)
    expect(r.baseIRRF).toBe(9048.37)
    expect(r.irrf).toBe(1592.30)
    expect(r.liquido).toBe(7456.07)
  })
  it('dependentes reduce baseIRRF by R$189,59 each', () => {
    const r = calcSalarioLiquido(5000, 2)
    expect(r.baseIRRF).toBeCloseTo(4490.41 - 2 * 189.59, 2)
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
    // pleno em base 4920,41 (27,5%) = 457,11; factor 0,25 → 114,28
    expect(calcSalarioLiquido(5500, 0).irrf).toBe(114.28)
  })
  it('R$6.000 paga 50% do IR pleno', () => {
    // pleno em base 5350,41 (27,5%) = 575,36; factor 0,5 → 287,68
    expect(calcSalarioLiquido(6000, 0).irrf).toBe(287.68)
  })
  it('R$7.000 paga 100% do IR pleno (fim do redutor)', () => {
    // pleno em base 6210,41 (27,5%) = 811,86; factor 1,0 → 811,86
    expect(calcSalarioLiquido(7000, 0).irrf).toBe(811.86)
  })
  it('R$7.000,01 também paga IR pleno (acima do redutor)', () => {
    const r = calcSalarioLiquido(7000.01, 0)
    expect(r.irrf).toBeGreaterThan(811)
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
    expect(decimoResult.inss).toBe(509.59)
    expect(decimoResult.irrf).toBe(0)
    expect(decimoResult.liquido).toBeCloseTo(5000 - 509.59, 2)
  })
  it('acima de R$5.000, 13th IRRF é maior que o mensal com dependentes (não deduz dependentes)', () => {
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

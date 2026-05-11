import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatMoneyInput,
  formatPercent,
  formatPercentInput,
  parseBrazilianMoney,
  parseBrazilianPercent,
} from './format'

describe('parseBrazilianMoney', () => {
  it('parses Brazilian currency-like input', () => {
    expect(parseBrazilianMoney('1.234,56')).toBe(1234.56)
    expect(parseBrazilianMoney('R$ 10.000,00')).toBe(10000)
    expect(parseBrazilianMoney('500')).toBe(500)
  })

  it('treats empty money input as zero', () => {
    expect(parseBrazilianMoney('')).toBe(0)
    expect(parseBrazilianMoney('   ')).toBe(0)
  })

  it('ignores invalid characters without accepting negative money', () => {
    expect(parseBrazilianMoney('-1.000,00')).toBe(1000)
    expect(parseBrazilianMoney('abc')).toBe(0)
  })
})

describe('parseBrazilianPercent', () => {
  it('parses comma and dot decimals', () => {
    expect(parseBrazilianPercent('10,65')).toBe(10.65)
    expect(parseBrazilianPercent('10.65')).toBe(10.65)
    expect(parseBrazilianPercent('100%')).toBe(100)
    expect(parseBrazilianPercent('1.000,50')).toBe(1000.5)
  })

  it('returns null for empty percent input', () => {
    expect(parseBrazilianPercent('')).toBeNull()
    expect(parseBrazilianPercent('   ')).toBeNull()
  })

  it('keeps negative percent values for validation layer', () => {
    expect(parseBrazilianPercent('-5,5')).toBe(-5.5)
  })
})

describe('formatCurrency', () => {
  it('formats BRL with two decimals', () => {
    expect(formatCurrency(1234.5)).toBe('R$ 1.234,50')
  })
})

describe('formatMoneyInput', () => {
  it('formats plain money inputs with two decimals and thousand separator', () => {
    expect(formatMoneyInput(1000)).toBe('1.000,00')
  })
})

describe('formatPercent', () => {
  it('formats percentages with up to two decimals', () => {
    expect(formatPercent(10)).toBe('10%')
    expect(formatPercent(10.655)).toBe('10,66%')
  })
})

describe('formatPercentInput', () => {
  it('formats numeric percentage input without duplicating the symbol', () => {
    expect(formatPercentInput(14.5)).toBe('14,5')
    expect(formatPercentInput(null)).toBe('')
  })
})

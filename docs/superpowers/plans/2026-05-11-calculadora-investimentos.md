# Calculadora de Investimentos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public investment calculator at `/investimentos` that simulates monthly investments and compares the selected investment against simplified savings, CDB 100% CDI, and hypothetical LCI/LCA 85% CDI.

**Architecture:** Follow the existing calculator pattern: page state in `src/pages`, pure financial logic in `src/lib/investimentos`, a hook in `src/hooks/investimentos`, and presentational components in `src/calculators/investimentos`. Keep calculations pure and tested first, then wire UI with stable contracts and accessibility labels.

**Tech Stack:** React 18, React Router, TypeScript, Vite, Vitest, React Testing Library, Tailwind CSS, Recharts.

---

## Source Spec

Design source: `docs/superpowers/specs/2026-05-11-calculadora-investimentos-design.md`

Read the spec before starting. The implementation must preserve these decisions:

- CDI and IPCA are editable and initially empty.
- Monthly contributions happen at the end of each month.
- The last monthly contribution is included in final invested total and final balance, but earns zero months of interest.
- Taxable products use lot-based IR with actual elapsed days between each lot date and redemption date.
- IOF is out of scope, but a non-blocking warning is shown if any taxable positive-yield lot has age below 30 days.
- The chart shows gross monthly evolution; final cards/table rank by net final value.
- Savings is simplified using CDI as Selic proxy and TR = 0.

## File Structure

Create:

- `src/lib/investimentos/types.ts`  
  Domain types shared by calculations, hook, and components.

- `src/lib/investimentos/format.ts`  
  Pure parsing/formatting helpers for BRL and percentages.

- `src/lib/investimentos/format.test.ts`  
  Unit tests for parsing and formatting.

- `src/lib/investimentos/calculations.ts`  
  Pure financial calculations, validation, simulation, tax, date helpers.

- `src/lib/investimentos/calculations.test.ts`  
  Unit tests and golden scenarios for financial behavior.

- `src/hooks/investimentos/useInvestimentosCalculations.ts`  
  Thin hook wrapping the pure calculation function with injected `startDate`.

- `src/hooks/investimentos/useInvestimentosCalculations.test.tsx`  
  Hook integration tests for validation, `startDate`, and errors.

- `src/calculators/investimentos/InputForm.tsx`  
  Controlled form with accessible labels, validation errors, and conditional fields.

- `src/calculators/investimentos/ResultCards.tsx`  
  Main result cards and warning/date-base display.

- `src/calculators/investimentos/ComparisonChart.tsx`  
  Recharts line chart plus testable textual summary.

- `src/calculators/investimentos/ComparisonTable.tsx`  
  Net comparison table in fixed row order.

- `src/pages/InvestimentosPage.tsx`  
  Public page composing form, hook, cards, chart, and table.

- `src/pages/InvestimentosPage.test.tsx`  
  UI happy-path and validation tests.

Modify:

- `src/App.tsx`  
  Add `/investimentos` route inside `PublicLayout`.

- `src/pages/Home.tsx`  
  Add third calculator card and adjust desktop grid.

- `src/test-setup.ts`  
  Add `ResizeObserver` mock if Recharts tests need it.

---

### Task 1: Domain Types And Formatting Helpers

**Files:**
- Create: `src/lib/investimentos/types.ts`
- Create: `src/lib/investimentos/format.ts`
- Create: `src/lib/investimentos/format.test.ts`

- [ ] **Step 1: Write failing format tests**

Create `src/lib/investimentos/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatPercent,
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

describe('formatPercent', () => {
  it('formats percentages with up to two decimals', () => {
    expect(formatPercent(10)).toBe('10%')
    expect(formatPercent(10.655)).toBe('10,66%')
  })
})
```

- [ ] **Step 2: Run the failing format tests**

Run:

```bash
npm test -- src/lib/investimentos/format.test.ts
```

Expected: FAIL because `src/lib/investimentos/format.ts` does not exist.

- [ ] **Step 3: Add domain types**

Create `src/lib/investimentos/types.ts`:

```ts
export type RateType = 'cdi_percent' | 'fixed' | 'ipca_plus'
export type TermUnit = 'months' | 'years'
export type InvestmentOptionId = 'custom' | 'savings' | 'cdb_100_cdi' | 'lci_lca_85_cdi'

export type InvestimentosField =
  | 'initialAmount'
  | 'monthlyContribution'
  | 'termValue'
  | 'cdiAnnualPercent'
  | 'ipcaAnnualPercent'
  | 'cdiPercent'
  | 'fixedAnnualPercent'
  | 'ipcaSpreadAnnualPercent'

export interface InvestimentosInputs {
  initialAmount: number
  hasMonthlyContribution: boolean
  monthlyContribution: number
  termValue: number
  termUnit: TermUnit
  cdiAnnualPercent: number | null
  ipcaAnnualPercent: number | null
  rateType: RateType
  cdiPercent: number | null
  fixedAnnualPercent: number | null
  ipcaSpreadAnnualPercent: number | null
  isTaxExempt: boolean
}

export interface NormalizedInvestimentosInputs {
  initialAmount: number
  hasMonthlyContribution: boolean
  monthlyContribution: number
  termMonths: number
  cdiAnnualRate: number
  ipcaAnnualRate: number
  rateType: RateType
  cdiFactor: number
  fixedAnnualRate: number
  ipcaSpreadAnnualRate: number
  isTaxExempt: boolean
  startDate: Date
}

export interface ComparisonResult {
  id: InvestmentOptionId
  label: string
  grossFinalValue: number
  investedTotal: number
  grossYield: number
  tax: number
  netFinalValue: number
  netYield: number
  netDifferenceFromCustom: number
  isBest: boolean
}

export interface SimulationPoint {
  month: number
  customGross: number
  savingsGross: number
  cdb100CdiGross: number
  lciLca85CdiGross: number
}

export interface CalculationResult {
  rows: ComparisonResult[]
  simulation: SimulationPoint[]
  bestOptionIds: InvestmentOptionId[]
  realGainEstimate?: number
  baseDate: Date
  warnings: string[]
}

export type InvestimentosErrors = Partial<Record<InvestimentosField, string>>

export interface CalculationState {
  result: CalculationResult | null
  errors: InvestimentosErrors
}
```

- [ ] **Step 4: Add format helpers**

Create `src/lib/investimentos/format.ts`:

```ts
export function parseBrazilianMoney(value: string): number {
  const normalized = value
    .trim()
    .replace(/[^\d,.-]/g, '')
    .replace(/-/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  return Number.parseFloat(normalized) || 0
}

export function parseBrazilianPercent(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = trimmed
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.')

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`
}
```

- [ ] **Step 5: Run format tests**

Run:

```bash
npm test -- src/lib/investimentos/format.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/lib/investimentos/types.ts src/lib/investimentos/format.ts src/lib/investimentos/format.test.ts
git commit -m "feat(investimentos): add domain types and format helpers"
```

---

### Task 2: Pure Calculation Engine

**Files:**
- Create: `src/lib/investimentos/calculations.ts`
- Create: `src/lib/investimentos/calculations.test.ts`

- [ ] **Step 1: Write failing unit tests for calculation helpers**

Create `src/lib/investimentos/calculations.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { InvestimentosInputs } from './types'
import {
  addMonths,
  annualToMonthlyRate,
  calculateInvestimentos,
  calculateSavingsMonthlyRate,
  daysBetween,
  getIrRateByDays,
  normalizeInputs,
} from './calculations'

const START_DATE = new Date(2026, 0, 31)

function baseInputs(patch: Partial<InvestimentosInputs> = {}): InvestimentosInputs {
  return {
    initialAmount: 1000,
    hasMonthlyContribution: false,
    monthlyContribution: 0,
    termValue: 12,
    termUnit: 'months',
    cdiAnnualPercent: 12,
    ipcaAnnualPercent: 4,
    rateType: 'cdi_percent',
    cdiPercent: 100,
    fixedAnnualPercent: null,
    ipcaSpreadAnnualPercent: null,
    isTaxExempt: false,
    ...patch,
  }
}

describe('date helpers', () => {
  it('adds months and clamps to last valid day', () => {
    const next = addMonths(new Date(2026, 0, 31), 1)
    expect(next.getFullYear()).toBe(2026)
    expect(next.getMonth()).toBe(1)
    expect(next.getDate()).toBe(28)
  })

  it('calculates elapsed calendar days', () => {
    expect(daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 31))).toBe(30)
  })
})

describe('rates', () => {
  it('converts annual rate to monthly equivalent', () => {
    expect(annualToMonthlyRate(0.12)).toBeCloseTo(Math.pow(1.12, 1 / 12) - 1, 10)
  })

  it('calculates savings monthly rate above 8.5% Selic proxy', () => {
    expect(calculateSavingsMonthlyRate(0.12)).toBe(0.005)
  })

  it('calculates savings monthly rate at or below 8.5% Selic proxy', () => {
    expect(calculateSavingsMonthlyRate(0.08)).toBeCloseTo(Math.pow(1 + 0.08 * 0.7, 1 / 12) - 1, 10)
  })

  it('uses CDI monthly equivalent before applying percent of CDI', () => {
    const result = calculateInvestimentos(baseInputs({ cdiAnnualPercent: 12, cdiPercent: 85 }), START_DATE)
    const expectedMonthlyCdi = Math.pow(1.12, 1 / 12) - 1
    expect(result.result?.simulation[1].customGross).toBeCloseTo(1000 * (1 + expectedMonthlyCdi * 0.85), 2)
  })
})

describe('IR table', () => {
  it('uses regressive tax boundaries by elapsed days', () => {
    expect(getIrRateByDays(180)).toBe(0.225)
    expect(getIrRateByDays(181)).toBe(0.2)
    expect(getIrRateByDays(360)).toBe(0.2)
    expect(getIrRateByDays(361)).toBe(0.175)
    expect(getIrRateByDays(720)).toBe(0.175)
    expect(getIrRateByDays(721)).toBe(0.15)
  })
})

describe('normalizeInputs', () => {
  it('returns errors when CDI and IPCA are empty', () => {
    const state = normalizeInputs(baseInputs({ cdiAnnualPercent: null, ipcaAnnualPercent: null }), START_DATE)
    expect(state.normalized).toBeNull()
    expect(state.errors.cdiAnnualPercent).toBe('Informe o CDI anual.')
    expect(state.errors.ipcaAnnualPercent).toBe('Informe o IPCA anual.')
  })

  it('normalizes human percent inputs to decimal rates', () => {
    const state = normalizeInputs(baseInputs({ cdiAnnualPercent: 10.65, ipcaAnnualPercent: 4.5 }), START_DATE)
    expect(state.normalized?.cdiAnnualRate).toBe(0.1065)
    expect(state.normalized?.ipcaAnnualRate).toBe(0.045)
  })

  it('preserves hasMonthlyContribution but uses zero aporte when disabled', () => {
    const state = normalizeInputs(baseInputs({ hasMonthlyContribution: false, monthlyContribution: 500 }), START_DATE)
    expect(state.normalized?.hasMonthlyContribution).toBe(false)
    expect(state.normalized?.monthlyContribution).toBe(0)
  })
})

describe('calculateInvestimentos', () => {
  it('returns empty result with errors for incomplete inputs', () => {
    const state = calculateInvestimentos(baseInputs({ initialAmount: 0, cdiAnnualPercent: null }), START_DATE)
    expect(state.result).toBeNull()
    expect(state.errors.initialAmount).toBe('Informe valor inicial ou aporte mensal.')
    expect(state.errors.cdiAnnualPercent).toBe('Informe o CDI anual.')
  })

  it('includes the final-month contribution without yield', () => {
    const state = calculateInvestimentos(baseInputs({
      initialAmount: 0,
      hasMonthlyContribution: true,
      monthlyContribution: 100,
      termValue: 2,
      fixedAnnualPercent: 12,
      rateType: 'fixed',
      isTaxExempt: true,
    }), START_DATE)

    const custom = state.result!.rows.find(row => row.id === 'custom')!
    const monthly = Math.pow(1.12, 1 / 12) - 1
    expect(custom.investedTotal).toBe(200)
    expect(custom.grossFinalValue).toBeCloseTo(100 * (1 + monthly) + 100, 2)
  })

  it('calculates lot-based IR using calendar days', () => {
    const state = calculateInvestimentos(baseInputs({
      initialAmount: 1000,
      hasMonthlyContribution: true,
      monthlyContribution: 100,
      termValue: 24,
      fixedAnnualPercent: 12,
      rateType: 'fixed',
      isTaxExempt: false,
    }), new Date(2026, 0, 1))

    const custom = state.result!.rows.find(row => row.id === 'custom')!
    expect(custom.tax).toBeGreaterThan(0)
    expect(custom.netFinalValue).toBeLessThan(custom.grossFinalValue)
  })

  it('keeps exempt products tax-free and CDB taxed', () => {
    const state = calculateInvestimentos(baseInputs({ termValue: 24 }), START_DATE)
    const cdb = state.result!.rows.find(row => row.id === 'cdb_100_cdi')!
    const lci = state.result!.rows.find(row => row.id === 'lci_lca_85_cdi')!
    const savings = state.result!.rows.find(row => row.id === 'savings')!
    expect(cdb.tax).toBeGreaterThan(0)
    expect(lci.tax).toBe(0)
    expect(savings.tax).toBe(0)
  })

  it('returns four fixed-order rows and month 0..term simulation points', () => {
    const state = calculateInvestimentos(baseInputs({ termValue: 3 }), START_DATE)
    expect(state.result!.rows.map(row => row.id)).toEqual(['custom', 'savings', 'cdb_100_cdi', 'lci_lca_85_cdi'])
    expect(state.result!.simulation.map(point => point.month)).toEqual([0, 1, 2, 3])
  })

  it('calculates IPCA+ nominal rate and real gain estimate', () => {
    const state = calculateInvestimentos(baseInputs({
      rateType: 'ipca_plus',
      cdiPercent: null,
      ipcaAnnualPercent: 4,
      ipcaSpreadAnnualPercent: 6,
      isTaxExempt: true,
    }), START_DATE)

    const custom = state.result!.rows.find(row => row.id === 'custom')!
    const nominal = (1 + 0.04) * (1 + 0.06) - 1
    expect(custom.grossFinalValue).toBeCloseTo(1000 * Math.pow(1 + nominal, 1), 2)
    expect(state.result!.realGainEstimate).toBeGreaterThan(0)
  })

  it('emits IOF warning when a taxable positive-yield lot is under 30 days old', () => {
    const state = calculateInvestimentos(baseInputs({
      initialAmount: 0,
      hasMonthlyContribution: true,
      monthlyContribution: 100,
      termValue: 1,
      fixedAnnualPercent: 12,
      rateType: 'fixed',
      isTaxExempt: false,
    }), START_DATE)

    expect(state.result!.warnings).toContain('IOF nao considerado para lotes com menos de 30 dias.')
  })
})
```

- [ ] **Step 2: Run failing calculation tests**

Run:

```bash
npm test -- src/lib/investimentos/calculations.test.ts
```

Expected: FAIL because `src/lib/investimentos/calculations.ts` does not exist.

- [ ] **Step 3: Implement pure calculation engine**

Create `src/lib/investimentos/calculations.ts`:

```ts
import type {
  CalculationResult,
  CalculationState,
  ComparisonResult,
  InvestmentOptionId,
  InvestimentosErrors,
  InvestimentosInputs,
  NormalizedInvestimentosInputs,
  SimulationPoint,
} from './types'

interface NormalizeResult {
  normalized: NormalizedInvestimentosInputs | null
  errors: InvestimentosErrors
}

interface Lot {
  principal: number
  value: number
  contributionMonth: number
  date: Date
}

interface ProductDefinition {
  id: InvestmentOptionId
  label: string
  monthlyRate: number
  taxable: boolean
}

const MAX_MONEY = 999_999_999.99

export function annualToMonthlyRate(annualRate: number): number {
  if (annualRate === 0) return 0
  return Math.pow(1 + annualRate, 1 / 12) - 1
}

export function addMonths(date: Date, months: number): Date {
  const year = date.getFullYear()
  const month = date.getMonth() + months
  const day = date.getDate()
  const target = new Date(year, month, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, lastDay))
  return target
}

export function daysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.round((endUtc - startUtc) / 86_400_000)
}

export function getIrRateByDays(days: number): number {
  if (days <= 180) return 0.225
  if (days <= 360) return 0.2
  if (days <= 720) return 0.175
  return 0.15
}

export function calculateSavingsMonthlyRate(cdiAnnualRate: number): number {
  if (cdiAnnualRate > 0.085) return 0.005
  return annualToMonthlyRate(cdiAnnualRate * 0.7)
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function validateRange(
  errors: InvestimentosErrors,
  field: keyof InvestimentosErrors,
  value: number | null,
  message: string,
  minExclusive: number | null,
  maxInclusive: number
) {
  if (value === null || Number.isNaN(value)) {
    errors[field] = message
    return
  }
  if (minExclusive === null ? value < 0 : value <= minExclusive) {
    errors[field] = message
    return
  }
  if (value > maxInclusive) {
    errors[field] = message
  }
}

export function normalizeInputs(inputs: InvestimentosInputs, startDate = new Date()): NormalizeResult {
  const errors: InvestimentosErrors = {}
  const termMonths = inputs.termUnit === 'years' ? inputs.termValue * 12 : inputs.termValue
  const monthlyContribution = inputs.hasMonthlyContribution ? inputs.monthlyContribution : 0

  if (inputs.initialAmount < 0 || inputs.initialAmount > MAX_MONEY) {
    errors.initialAmount = 'Informe um valor inicial valido.'
  }

  if (inputs.monthlyContribution < 0 || inputs.monthlyContribution > MAX_MONEY) {
    errors.monthlyContribution = 'Informe um aporte mensal valido.'
  }

  if (inputs.initialAmount <= 0 && monthlyContribution <= 0) {
    errors.initialAmount = 'Informe valor inicial ou aporte mensal.'
  }

  if (!Number.isInteger(inputs.termValue) || inputs.termValue <= 0) {
    errors.termValue = 'Informe um prazo inteiro maior que zero.'
  } else if (inputs.termUnit === 'months' && inputs.termValue > 600) {
    errors.termValue = 'O prazo maximo e de 600 meses.'
  } else if (inputs.termUnit === 'years' && inputs.termValue > 50) {
    errors.termValue = 'O prazo maximo e de 50 anos.'
  }

  validateRange(errors, 'cdiAnnualPercent', inputs.cdiAnnualPercent, 'Informe o CDI anual.', null, 100)
  validateRange(errors, 'ipcaAnnualPercent', inputs.ipcaAnnualPercent, 'Informe o IPCA anual.', -99.99, 100)

  if (inputs.rateType === 'cdi_percent') {
    validateRange(errors, 'cdiPercent', inputs.cdiPercent, 'Informe o percentual do CDI.', null, 1000)
  }
  if (inputs.rateType === 'fixed') {
    validateRange(errors, 'fixedAnnualPercent', inputs.fixedAnnualPercent, 'Informe a taxa prefixada.', -99.99, 100)
  }
  if (inputs.rateType === 'ipca_plus') {
    validateRange(errors, 'ipcaSpreadAnnualPercent', inputs.ipcaSpreadAnnualPercent, 'Informe a taxa real acima do IPCA.', -99.99, 100)
  }

  if (Object.keys(errors).length > 0) {
    return { normalized: null, errors }
  }

  const cdiAnnualRate = inputs.cdiAnnualPercent! / 100
  const ipcaAnnualRate = inputs.ipcaAnnualPercent! / 100
  const fixedAnnualRate = (inputs.fixedAnnualPercent ?? 0) / 100
  const ipcaSpreadAnnualRate = (inputs.ipcaSpreadAnnualPercent ?? 0) / 100

  const composedIpcaRate = (1 + ipcaAnnualRate) * (1 + ipcaSpreadAnnualRate) - 1
  if (inputs.rateType === 'ipca_plus' && composedIpcaRate <= -1) {
    errors.ipcaSpreadAnnualPercent = 'A taxa composta precisa ser maior que -100%.'
    return { normalized: null, errors }
  }

  return {
    normalized: {
      initialAmount: inputs.initialAmount,
      hasMonthlyContribution: inputs.hasMonthlyContribution,
      monthlyContribution,
      termMonths,
      cdiAnnualRate,
      ipcaAnnualRate,
      rateType: inputs.rateType,
      cdiFactor: (inputs.cdiPercent ?? 0) / 100,
      fixedAnnualRate,
      ipcaSpreadAnnualRate,
      isTaxExempt: inputs.isTaxExempt,
      startDate,
    },
    errors,
  }
}

function customMonthlyRate(inputs: NormalizedInvestimentosInputs): number {
  if (inputs.rateType === 'cdi_percent') {
    return annualToMonthlyRate(inputs.cdiAnnualRate) * inputs.cdiFactor
  }

  if (inputs.rateType === 'fixed') {
    return annualToMonthlyRate(inputs.fixedAnnualRate)
  }

  const nominalAnnualRate = (1 + inputs.ipcaAnnualRate) * (1 + inputs.ipcaSpreadAnnualRate) - 1
  return annualToMonthlyRate(nominalAnnualRate)
}

function buildLots(inputs: NormalizedInvestimentosInputs, monthlyRate: number): { lots: Lot[]; grossSeries: number[] } {
  const lots: Lot[] = []
  const grossSeries: number[] = [inputs.initialAmount]

  if (inputs.initialAmount > 0) {
    lots.push({
      principal: inputs.initialAmount,
      value: inputs.initialAmount,
      contributionMonth: 0,
      date: inputs.startDate,
    })
  }

  for (let month = 1; month <= inputs.termMonths; month += 1) {
    for (const lot of lots) {
      lot.value *= 1 + monthlyRate
    }

    if (inputs.monthlyContribution > 0) {
      lots.push({
        principal: inputs.monthlyContribution,
        value: inputs.monthlyContribution,
        contributionMonth: month,
        date: addMonths(inputs.startDate, month),
      })
    }

    grossSeries.push(lots.reduce((sum, lot) => sum + lot.value, 0))
  }

  return { lots, grossSeries }
}

function calculateProduct(
  product: ProductDefinition,
  inputs: NormalizedInvestimentosInputs,
  customNetFinalValue: number | null
): { row: ComparisonResult; grossSeries: number[]; hasShortTaxableLot: boolean } {
  const { lots, grossSeries } = buildLots(inputs, product.monthlyRate)
  const redemptionDate = addMonths(inputs.startDate, inputs.termMonths)
  let tax = 0
  let hasShortTaxableLot = false

  for (const lot of lots) {
    const yieldValue = lot.value - lot.principal
    if (product.taxable && yieldValue > 0) {
      const days = daysBetween(lot.date, redemptionDate)
      if (days < 30) hasShortTaxableLot = true
      tax += yieldValue * getIrRateByDays(days)
    }
  }

  const investedTotal = lots.reduce((sum, lot) => sum + lot.principal, 0)
  const grossFinalValue = lots.reduce((sum, lot) => sum + lot.value, 0)
  const netFinalValue = grossFinalValue - tax

  return {
    row: {
      id: product.id,
      label: product.label,
      grossFinalValue: roundCurrency(grossFinalValue),
      investedTotal: roundCurrency(investedTotal),
      grossYield: roundCurrency(grossFinalValue - investedTotal),
      tax: roundCurrency(tax),
      netFinalValue: roundCurrency(netFinalValue),
      netYield: roundCurrency(netFinalValue - investedTotal),
      netDifferenceFromCustom: roundCurrency(customNetFinalValue === null ? 0 : netFinalValue - customNetFinalValue),
      isBest: false,
    },
    grossSeries,
    hasShortTaxableLot,
  }
}

function calculateRealGainEstimate(inputs: NormalizedInvestimentosInputs, customNetFinalValue: number): number | undefined {
  if (inputs.rateType !== 'ipca_plus') return undefined

  const ipcaMonthly = annualToMonthlyRate(inputs.ipcaAnnualRate)
  let correctedInvested = 0

  if (inputs.initialAmount > 0) {
    correctedInvested += inputs.initialAmount * Math.pow(1 + ipcaMonthly, inputs.termMonths)
  }

  if (inputs.monthlyContribution > 0) {
    for (let month = 1; month <= inputs.termMonths; month += 1) {
      correctedInvested += inputs.monthlyContribution * Math.pow(1 + ipcaMonthly, inputs.termMonths - month)
    }
  }

  return roundCurrency(customNetFinalValue - correctedInvested)
}

export function calculateInvestimentos(inputs: InvestimentosInputs, startDate = new Date()): CalculationState {
  const { normalized, errors } = normalizeInputs(inputs, startDate)
  if (!normalized) return { result: null, errors }

  const cdiMonthly = annualToMonthlyRate(normalized.cdiAnnualRate)
  const products: ProductDefinition[] = [
    {
      id: 'custom',
      label: 'Seu investimento',
      monthlyRate: customMonthlyRate(normalized),
      taxable: !normalized.isTaxExempt,
    },
    {
      id: 'savings',
      label: 'Poupanca simplificada (CDI como proxy da Selic, TR = 0)',
      monthlyRate: calculateSavingsMonthlyRate(normalized.cdiAnnualRate),
      taxable: false,
    },
    {
      id: 'cdb_100_cdi',
      label: 'CDB 100% CDI',
      monthlyRate: cdiMonthly,
      taxable: true,
    },
    {
      id: 'lci_lca_85_cdi',
      label: 'LCI/LCA hipotetica 85% CDI',
      monthlyRate: cdiMonthly * 0.85,
      taxable: false,
    },
  ]

  const calculated = products.map(product => calculateProduct(product, normalized, null))
  const customNet = calculated[0].row.netFinalValue
  const recalculated = products.map(product => calculateProduct(product, normalized, customNet))
  const maxNet = Math.max(...recalculated.map(item => item.row.netFinalValue))
  const bestOptionIds = recalculated
    .filter(item => Math.abs(item.row.netFinalValue - maxNet) <= 0.01)
    .map(item => item.row.id)
  const rows = recalculated.map(item => ({
    ...item.row,
    isBest: bestOptionIds.includes(item.row.id),
  }))
  const warnings = recalculated.some(item => item.hasShortTaxableLot)
    ? ['IOF nao considerado para lotes com menos de 30 dias.']
    : []

  const simulation: SimulationPoint[] = recalculated[0].grossSeries.map((_, month) => ({
    month,
    customGross: roundCurrency(recalculated[0].grossSeries[month]),
    savingsGross: roundCurrency(recalculated[1].grossSeries[month]),
    cdb100CdiGross: roundCurrency(recalculated[2].grossSeries[month]),
    lciLca85CdiGross: roundCurrency(recalculated[3].grossSeries[month]),
  }))

  const result: CalculationResult = {
    rows,
    simulation,
    bestOptionIds,
    realGainEstimate: calculateRealGainEstimate(normalized, customNet),
    baseDate: normalized.startDate,
    warnings,
  }

  return { result, errors: {} }
}
```

- [ ] **Step 4: Run calculation tests**

Run:

```bash
npm test -- src/lib/investimentos/calculations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/investimentos/calculations.ts src/lib/investimentos/calculations.test.ts
git commit -m "feat(investimentos): add calculation engine"
```

---

### Task 3: Hook Wrapper

**Files:**
- Create: `src/hooks/investimentos/useInvestimentosCalculations.ts`
- Create: `src/hooks/investimentos/useInvestimentosCalculations.test.tsx`

- [ ] **Step 1: Write failing hook tests**

Create `src/hooks/investimentos/useInvestimentosCalculations.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useInvestimentosCalculations } from './useInvestimentosCalculations'
import type { InvestimentosInputs } from '../../lib/investimentos/types'

function inputs(patch: Partial<InvestimentosInputs> = {}): InvestimentosInputs {
  return {
    initialAmount: 1000,
    hasMonthlyContribution: false,
    monthlyContribution: 0,
    termValue: 12,
    termUnit: 'months',
    cdiAnnualPercent: 12,
    ipcaAnnualPercent: 4,
    rateType: 'cdi_percent',
    cdiPercent: 100,
    fixedAnnualPercent: null,
    ipcaSpreadAnnualPercent: null,
    isTaxExempt: false,
    ...patch,
  }
}

describe('useInvestimentosCalculations', () => {
  it('returns calculation result for valid inputs', () => {
    const { result } = renderHook(() =>
      useInvestimentosCalculations(inputs(), { startDate: new Date(2026, 0, 1) })
    )

    expect(result.current.result?.rows).toHaveLength(4)
    expect(result.current.errors).toEqual({})
  })

  it('returns validation errors for invalid inputs', () => {
    const { result } = renderHook(() =>
      useInvestimentosCalculations(inputs({ initialAmount: 0, cdiAnnualPercent: null }))
    )

    expect(result.current.result).toBeNull()
    expect(result.current.errors.initialAmount).toBe('Informe valor inicial ou aporte mensal.')
    expect(result.current.errors.cdiAnnualPercent).toBe('Informe o CDI anual.')
  })

  it('uses injected start date as base date', () => {
    const startDate = new Date(2026, 4, 11)
    const { result } = renderHook(() => useInvestimentosCalculations(inputs(), { startDate }))
    expect(result.current.result?.baseDate).toBe(startDate)
  })
})
```

- [ ] **Step 2: Run failing hook tests**

Run:

```bash
npm test -- src/hooks/investimentos/useInvestimentosCalculations.test.tsx
```

Expected: FAIL because the hook file does not exist.

- [ ] **Step 3: Implement hook**

Create `src/hooks/investimentos/useInvestimentosCalculations.ts`:

```ts
import { useMemo } from 'react'
import { calculateInvestimentos } from '../../lib/investimentos/calculations'
import type { CalculationState, InvestimentosInputs } from '../../lib/investimentos/types'

interface Options {
  startDate?: Date
}

export function useInvestimentosCalculations(
  inputs: InvestimentosInputs,
  options: Options = {}
): CalculationState {
  const startDate = options.startDate

  return useMemo(
    () => calculateInvestimentos(inputs, startDate ?? new Date()),
    [inputs, startDate]
  )
}
```

- [ ] **Step 4: Run hook tests**

Run:

```bash
npm test -- src/hooks/investimentos/useInvestimentosCalculations.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/hooks/investimentos/useInvestimentosCalculations.ts src/hooks/investimentos/useInvestimentosCalculations.test.tsx
git commit -m "feat(investimentos): add calculation hook"
```

---

### Task 4: Calculator UI Components

**Files:**
- Create: `src/calculators/investimentos/InputForm.tsx`
- Create: `src/calculators/investimentos/ResultCards.tsx`
- Create: `src/calculators/investimentos/ComparisonChart.tsx`
- Create: `src/calculators/investimentos/ComparisonTable.tsx`

- [ ] **Step 1: Add controlled input form component**

Create `src/calculators/investimentos/InputForm.tsx`:

```tsx
import { useEffect, useState } from 'react'
import {
  parseBrazilianMoney,
  parseBrazilianPercent,
} from '../../lib/investimentos/format'
import type {
  InvestimentosErrors,
  InvestimentosInputs,
  RateType,
  TermUnit,
} from '../../lib/investimentos/types'

interface Props {
  value: InvestimentosInputs
  errors: InvestimentosErrors
  onChange: (next: InvestimentosInputs) => void
}

function moneyString(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function percentString(value: number | null): string {
  if (value === null) return ''
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export default function InputForm({ value, errors, onChange }: Props) {
  const [initialAmount, setInitialAmount] = useState(moneyString(value.initialAmount))
  const [monthlyContribution, setMonthlyContribution] = useState(moneyString(value.monthlyContribution))
  const [cdiAnnualPercent, setCdiAnnualPercent] = useState(percentString(value.cdiAnnualPercent))
  const [ipcaAnnualPercent, setIpcaAnnualPercent] = useState(percentString(value.ipcaAnnualPercent))
  const [cdiPercent, setCdiPercent] = useState(percentString(value.cdiPercent))
  const [fixedAnnualPercent, setFixedAnnualPercent] = useState(percentString(value.fixedAnnualPercent))
  const [ipcaSpreadAnnualPercent, setIpcaSpreadAnnualPercent] = useState(percentString(value.ipcaSpreadAnnualPercent))

  useEffect(() => {
    setInitialAmount(moneyString(value.initialAmount))
    setMonthlyContribution(moneyString(value.monthlyContribution))
    setCdiAnnualPercent(percentString(value.cdiAnnualPercent))
    setIpcaAnnualPercent(percentString(value.ipcaAnnualPercent))
    setCdiPercent(percentString(value.cdiPercent))
    setFixedAnnualPercent(percentString(value.fixedAnnualPercent))
    setIpcaSpreadAnnualPercent(percentString(value.ipcaSpreadAnnualPercent))
  }, [])

  function update(patch: Partial<InvestimentosInputs>) {
    onChange({ ...value, ...patch })
  }

  function errorFor(field: keyof InvestimentosErrors): string | undefined {
    return errors[field]
  }

  function inputErrorProps(field: keyof InvestimentosErrors) {
    const message = errorFor(field)
    return {
      'aria-invalid': message ? true : undefined,
      'aria-describedby': message ? `${field}-error` : undefined,
    }
  }

  function renderError(field: keyof InvestimentosErrors) {
    const message = errorFor(field)
    if (!message) return null
    return <span id={`${field}-error`} className="text-xs text-red-600">{message}</span>
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100 h-fit">
      <h2 className="text-lg font-semibold text-gray-700">Dados do investimento</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">Valor inicial</span>
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
          <span className="text-gray-400 mr-1 text-sm">R$</span>
          <input
            type="text"
            inputMode="decimal"
            className="flex-1 outline-none text-sm"
            placeholder="10.000,00"
            value={initialAmount}
            onChange={event => {
              setInitialAmount(event.target.value)
              update({ initialAmount: parseBrazilianMoney(event.target.value) })
            }}
            onBlur={() => setInitialAmount(moneyString(value.initialAmount))}
            {...inputErrorProps('initialAmount')}
          />
        </div>
        {renderError('initialAmount')}
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 accent-blue-600"
          checked={value.hasMonthlyContribution}
          onChange={event => update({ hasMonthlyContribution: event.target.checked })}
        />
        <span className="text-sm font-medium text-gray-600">Fazer aportes mensais</span>
      </label>

      {value.hasMonthlyContribution && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">Aporte mensal</span>
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
            <span className="text-gray-400 mr-1 text-sm">R$</span>
            <input
              type="text"
              inputMode="decimal"
              className="flex-1 outline-none text-sm"
              placeholder="500,00"
              value={monthlyContribution}
              onChange={event => {
                setMonthlyContribution(event.target.value)
                update({ monthlyContribution: parseBrazilianMoney(event.target.value) })
              }}
              onBlur={() => setMonthlyContribution(moneyString(value.monthlyContribution))}
              {...inputErrorProps('monthlyContribution')}
            />
          </div>
          <span className="text-xs text-gray-400">Aporte considerado no fim de cada mes.</span>
          {renderError('monthlyContribution')}
        </label>
      )}

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">Prazo</span>
          <input
            type="number"
            min={1}
            max={value.termUnit === 'years' ? 50 : 600}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={value.termValue || ''}
            onChange={event => update({ termValue: Number.parseInt(event.target.value, 10) || 0 })}
            {...inputErrorProps('termValue')}
          />
          {renderError('termValue')}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">Unidade</span>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={value.termUnit}
            onChange={event => update({ termUnit: event.target.value as TermUnit })}
          >
            <option value="months">Meses</option>
            <option value="years">Anos</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">CDI anual</span>
          <input
            type="text"
            inputMode="decimal"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="10,65"
            value={cdiAnnualPercent}
            onChange={event => {
              setCdiAnnualPercent(event.target.value)
              update({ cdiAnnualPercent: parseBrazilianPercent(event.target.value) })
            }}
            {...inputErrorProps('cdiAnnualPercent')}
          />
          {renderError('cdiAnnualPercent')}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">IPCA anual</span>
          <input
            type="text"
            inputMode="decimal"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="4,50"
            value={ipcaAnnualPercent}
            onChange={event => {
              setIpcaAnnualPercent(event.target.value)
              update({ ipcaAnnualPercent: parseBrazilianPercent(event.target.value) })
            }}
            {...inputErrorProps('ipcaAnnualPercent')}
          />
          {renderError('ipcaAnnualPercent')}
        </label>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-gray-700">Rentabilidade do investimento</legend>
        <div className="grid grid-cols-1 gap-2">
          {[
            ['cdi_percent', '% do CDI'],
            ['fixed', 'Prefixado'],
            ['ipca_plus', 'IPCA + taxa'],
          ].map(([id, label]) => (
            <label key={id} className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="radio"
                className="w-4 h-4 accent-blue-600"
                checked={value.rateType === id}
                onChange={() => update({ rateType: id as RateType })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {value.rateType === 'cdi_percent' && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">% do CDI</span>
          <input
            type="text"
            inputMode="decimal"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={cdiPercent}
            onChange={event => {
              setCdiPercent(event.target.value)
              update({ cdiPercent: parseBrazilianPercent(event.target.value) })
            }}
            {...inputErrorProps('cdiPercent')}
          />
          {renderError('cdiPercent')}
        </label>
      )}

      {value.rateType === 'fixed' && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">Taxa prefixada ao ano</span>
          <input
            type="text"
            inputMode="decimal"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="12,00"
            value={fixedAnnualPercent}
            onChange={event => {
              setFixedAnnualPercent(event.target.value)
              update({ fixedAnnualPercent: parseBrazilianPercent(event.target.value) })
            }}
            {...inputErrorProps('fixedAnnualPercent')}
          />
          {renderError('fixedAnnualPercent')}
        </label>
      )}

      {value.rateType === 'ipca_plus' && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-600">Taxa real acima do IPCA</span>
          <input
            type="text"
            inputMode="decimal"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="6,00"
            value={ipcaSpreadAnnualPercent}
            onChange={event => {
              setIpcaSpreadAnnualPercent(event.target.value)
              update({ ipcaSpreadAnnualPercent: parseBrazilianPercent(event.target.value) })
            }}
            {...inputErrorProps('ipcaSpreadAnnualPercent')}
          />
          {renderError('ipcaSpreadAnnualPercent')}
        </label>
      )}

      <fieldset className="flex flex-col gap-2 border-t border-gray-100 pt-3">
        <legend className="text-sm font-semibold text-gray-700">Imposto de renda</legend>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-blue-600"
            checked={value.isTaxExempt}
            onChange={event => update({ isTaxExempt: event.target.checked })}
          />
          <span className="text-sm font-medium text-gray-600">Aplicacao isenta de IR</span>
        </label>
      </fieldset>
    </div>
  )
}
```

- [ ] **Step 2: Add result cards**

Create `src/calculators/investimentos/ResultCards.tsx`:

```tsx
import { formatCurrency } from '../../lib/investimentos/format'
import type { CalculationResult } from '../../lib/investimentos/types'

interface Props {
  result: CalculationResult
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR')
}

export default function ResultCards({ result }: Props) {
  const custom = result.rows.find(row => row.id === 'custom')!

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <div className="md:col-span-2 xl:col-span-1 bg-blue-900 text-white rounded-xl p-5 shadow-sm">
        <p className="text-xs text-blue-200 uppercase tracking-wide">Valor liquido final</p>
        <p className="text-2xl font-bold mt-2">{formatCurrency(custom.netFinalValue)}</p>
        <p className="text-xs text-blue-200 mt-2">Data-base: {formatDate(result.baseDate)}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Quanto voce colocou</p>
        <p className="text-xl font-semibold text-slate-800 mt-2">{formatCurrency(custom.investedTotal)}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Quanto rendeu</p>
        <p className="text-xl font-semibold text-emerald-700 mt-2">{formatCurrency(custom.grossYield)}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Imposto estimado</p>
        <p className="text-xl font-semibold text-slate-800 mt-2">{formatCurrency(custom.tax)}</p>
      </div>

      {result.realGainEstimate !== undefined && (
        <div className="md:col-span-2 xl:col-span-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-emerald-800">Ganho real estimado</p>
          <p className="text-sm text-emerald-700 mt-1">
            {formatCurrency(result.realGainEstimate)} acima da inflacao informada.
          </p>
        </div>
      )}

      {result.warnings.map(warning => (
        <div key={warning} className="md:col-span-2 xl:col-span-4 bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-sm text-amber-800">{warning}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Add comparison chart**

Create `src/calculators/investimentos/ComparisonChart.tsx`:

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../../lib/investimentos/format'
import type { ComparisonResult, SimulationPoint } from '../../lib/investimentos/types'

interface Props {
  simulation: SimulationPoint[]
  rows: ComparisonResult[]
}

function compactCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return formatCurrency(value)
}

export default function ComparisonChart({ simulation, rows }: Props) {
  const finalRows = rows.map(row => `${row.label}: ${formatCurrency(row.netFinalValue)}`).join(' | ')

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5" aria-labelledby="investment-chart-title">
      <h3 id="investment-chart-title" className="text-sm font-semibold text-gray-700">
        Evolucao bruta mes a mes
      </h3>
      <p className="text-xs text-gray-500 mt-1">
        O grafico mostra valores brutos. A tabela abaixo compara os valores liquidos finais.
      </p>
      <p className="sr-only" data-testid="chart-summary">
        Valores liquidos finais: {finalRows}
      </p>

      <div className="h-72 sm:h-80 mt-4" data-testid="investment-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={simulation} margin={{ top: 4, right: 16, left: 8, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tickFormatter={compactCurrency} tick={{ fontSize: 10, fill: '#94a3b8' }} width={72} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Mes ${label}`}
              contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="customGross" name="Seu investimento" stroke="#2563eb" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="savingsGross" name="Poupanca simplificada" stroke="#64748b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cdb100CdiGross" name="CDB 100% CDI" stroke="#059669" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="lciLca85CdiGross" name="LCI/LCA hipotetica 85% CDI" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Add comparison table**

Create `src/calculators/investimentos/ComparisonTable.tsx`:

```tsx
import { formatCurrency } from '../../lib/investimentos/format'
import type { ComparisonResult } from '../../lib/investimentos/types'

interface Props {
  rows: ComparisonResult[]
}

export default function ComparisonTable({ rows }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <caption className="sr-only">Comparativo liquido final dos investimentos</caption>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Alternativa</th>
              <th className="text-right font-semibold px-4 py-3">Valor bruto</th>
              <th className="text-right font-semibold px-4 py-3">Imposto</th>
              <th className="text-right font-semibold px-4 py-3">Valor liquido</th>
              <th className="text-right font-semibold px-4 py-3">Diferenca liquida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => (
              <tr key={row.id} data-testid={`comparison-row-${row.id}`} className={row.isBest ? 'bg-emerald-50/60' : undefined}>
                <td className="px-4 py-3 font-medium text-slate-700">
                  {row.label}
                  {row.isBest && <span className="ml-2 text-xs text-emerald-700 font-semibold">Melhor resultado</span>}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.grossFinalValue)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.tax)}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(row.netFinalValue)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.netDifferenceFromCustom)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit Task 4**

```bash
git add src/calculators/investimentos/InputForm.tsx src/calculators/investimentos/ResultCards.tsx src/calculators/investimentos/ComparisonChart.tsx src/calculators/investimentos/ComparisonTable.tsx
git commit -m "feat(investimentos): add calculator components"
```

---

### Task 5: Page, Route, Home Card, And UI Tests

**Files:**
- Create: `src/pages/InvestimentosPage.tsx`
- Create: `src/pages/InvestimentosPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/test-setup.ts`

- [ ] **Step 1: Add ResizeObserver test setup**

Modify `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock
```

- [ ] **Step 2: Write failing page tests**

Create `src/pages/InvestimentosPage.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import InvestimentosPage from './InvestimentosPage'
import Home from './Home'
import { App } from '../App'

function renderPage() {
  return render(
    <BrowserRouter>
      <InvestimentosPage />
    </BrowserRouter>
  )
}

describe('InvestimentosPage', () => {
  it('starts with empty result state while CDI and IPCA are empty', () => {
    renderPage()
    expect(screen.getByText('Preencha os dados do investimento')).toBeInTheDocument()
  })

  it('renders result cards, chart, and table after valid input', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Valor inicial'), { target: { value: '10.000,00' } })
    fireEvent.change(screen.getByLabelText('CDI anual'), { target: { value: '10,65' } })
    fireEvent.change(screen.getByLabelText('IPCA anual'), { target: { value: '4,50' } })
    fireEvent.change(screen.getByLabelText('% do CDI'), { target: { value: '100' } })

    expect(screen.getByText('Valor liquido final')).toBeInTheDocument()
    expect(screen.getByText('Evolucao bruta mes a mes')).toBeInTheDocument()
    expect(screen.getByText('Comparativo liquido final dos investimentos')).toBeInTheDocument()
    expect(screen.getByTestId('comparison-row-custom')).toBeInTheDocument()
    expect(screen.getByTestId('comparison-row-cdb_100_cdi')).toBeInTheDocument()
  })

  it('shows validation error beside active empty rate field', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Valor inicial'), { target: { value: '10.000,00' } })
    fireEvent.change(screen.getByLabelText('CDI anual'), { target: { value: '10,65' } })
    fireEvent.change(screen.getByLabelText('IPCA anual'), { target: { value: '4,50' } })
    fireEvent.click(screen.getByLabelText('Prefixado'))

    expect(screen.getByText('Informe a taxa prefixada.')).toBeInTheDocument()
  })
})

describe('route and home integration', () => {
  it('home links to investment calculator', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    )

    expect(screen.getByRole('link', { name: /calculadora de investimentos/i })).toHaveAttribute('href', '/investimentos')
  })

  it('app route renders investments page', () => {
    window.history.pushState({}, '', '/investimentos')
    render(<App />)
    expect(screen.getByRole('heading', { name: /calculadora de investimentos/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run failing page tests**

Run:

```bash
npm test -- src/pages/InvestimentosPage.test.tsx
```

Expected: FAIL because `InvestimentosPage` does not exist and route/Home are not wired.

- [ ] **Step 4: Add investment page**

Create `src/pages/InvestimentosPage.tsx`:

```tsx
import { useCallback, useState } from 'react'
import type { InvestimentosInputs } from '../lib/investimentos/types'
import { useInvestimentosCalculations } from '../hooks/investimentos/useInvestimentosCalculations'
import InputForm from '../calculators/investimentos/InputForm'
import ResultCards from '../calculators/investimentos/ResultCards'
import ComparisonChart from '../calculators/investimentos/ComparisonChart'
import ComparisonTable from '../calculators/investimentos/ComparisonTable'

const DEFAULT_INPUTS: InvestimentosInputs = {
  initialAmount: 0,
  hasMonthlyContribution: false,
  monthlyContribution: 0,
  termValue: 12,
  termUnit: 'months',
  cdiAnnualPercent: null,
  ipcaAnnualPercent: null,
  rateType: 'cdi_percent',
  cdiPercent: 100,
  fixedAnnualPercent: null,
  ipcaSpreadAnnualPercent: null,
  isTaxExempt: false,
}

export default function InvestimentosPage() {
  const [inputs, setInputs] = useState<InvestimentosInputs>(DEFAULT_INPUTS)
  const { result, errors } = useInvestimentosCalculations(inputs)

  const handleChange = useCallback((next: InvestimentosInputs) => {
    setInputs(next)
  }, [])

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-indigo-700 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">Calculadora de Investimentos</h1>
          <p className="text-sm text-blue-200 mt-2 max-w-3xl leading-relaxed">
            Compare um investimento com poupanca simplificada, CDB 100% CDI e LCI/LCA hipotetica 85% CDI.
            CDI e IPCA sao premissas informadas por voce.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-96 shrink-0">
            <InputForm value={inputs} errors={errors} onChange={handleChange} />
          </div>

          <div className="flex-1 flex flex-col gap-4">
            {result ? (
              <>
                <ResultCards result={result} />
                <ComparisonChart simulation={result.simulation} rows={result.rows} />
                <ComparisonTable rows={result.rows} />
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
                  Valores estimados. A simulacao nao considera marcacao a mercado, spread, taxas, carencia,
                  liquidez, risco de credito, cobertura/limites/elegibilidade do FGC, mudancas futuras de
                  tributacao, come-cotas ou IOF.
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-slate-200 bg-white text-slate-400">
                <div className="text-center px-4">
                  <div className="text-4xl mb-3">R$</div>
                  <p className="text-base font-semibold text-slate-500">Preencha os dados do investimento</p>
                  <p className="text-sm mt-1">Os resultados aparecerao aqui</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Wire route in App**

Modify `src/App.tsx` imports:

```tsx
import InvestimentosPage from './pages/InvestimentosPage';
```

Add route inside the `PublicLayout` route block:

```tsx
<Route path="/investimentos" element={<InvestimentosPage />} />
```

- [ ] **Step 6: Add Home card**

Modify `src/pages/Home.tsx` `CALCULATORS`:

```tsx
const CALCULATORS = [
  {
    to: '/aposentadoria',
    icon: 'R$',
    title: 'Calculadora de Aposentadoria',
    description: 'Descubra quanto poupar por mes para se aposentar com a renda que voce quer',
  },
  {
    to: '/salario',
    icon: 'R$',
    title: 'Calculadora de Salario Liquido',
    description: 'Veja exatamente quanto cai na sua conta apos INSS e IR',
  },
  {
    to: '/investimentos',
    icon: '%',
    title: 'Calculadora de Investimentos',
    description: 'Compare seu investimento com poupanca, CDB e LCI/LCA',
  },
]
```

Modify the grid class:

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
```

- [ ] **Step 7: Run page tests**

Run:

```bash
npm test -- src/pages/InvestimentosPage.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit Task 5**

```bash
git add src/pages/InvestimentosPage.tsx src/pages/InvestimentosPage.test.tsx src/App.tsx src/pages/Home.tsx src/test-setup.ts
git commit -m "feat(investimentos): add public calculator page"
```

---

### Task 6: Full Verification And Polish

**Files:**
- Review all files created or modified in Tasks 1-5.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: PASS for existing and new tests.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: PASS and Vite writes `dist/`.

- [ ] **Step 3: Inspect status**

Run:

```bash
git status --short
```

Expected: only expected generated/build artifacts are untracked or modified. Do not stage unrelated pre-existing files such as `salario-features-completas.png` or `supabase/.temp/`.

- [ ] **Step 4: Commit any verification fixes**

If tests or build required code fixes, commit only the touched feature files:

```bash
git add src/lib/investimentos src/hooks/investimentos src/calculators/investimentos src/pages/InvestimentosPage.tsx src/pages/InvestimentosPage.test.tsx src/App.tsx src/pages/Home.tsx src/test-setup.ts
git commit -m "fix(investimentos): stabilize calculator verification"
```

Expected: commit created only if fixes were necessary.

---

## Self-Review Checklist

- Spec coverage:
  - `/investimentos` route and Home card: Task 5.
  - Editable CDI/IPCA and empty initial state: Tasks 4 and 5.
  - Value initial, monthly contribution toggle, term in months/years, three rate types, IR toggle: Tasks 1, 2, 4, 5.
  - Monthly end-of-month contributions and final-month contribution convention: Task 2.
  - Lot-based IR with real elapsed days: Task 2.
  - IOF warning: Task 2 and Task 5.
  - Savings simplified from CDI proxy and TR zero: Task 2 and Task 5.
  - Gross chart and net table: Tasks 4 and 5.
  - Accessibility and mobile table/chart behavior: Tasks 4 and 5.
  - Unit, hook, route, page tests plus build: Tasks 1, 2, 3, 5, 6.

- Placeholder scan:
  - No implementation step uses placeholder language.
  - Every new source file has concrete code in the relevant task.
  - Each command includes expected result.

- Type consistency:
  - `InvestimentosInputs`, `NormalizedInvestimentosInputs`, `CalculationResult`, `ComparisonResult`, and `InvestimentosErrors` names match across tasks.
  - UI components consume `rows`, not `comparisons`.
  - Hook returns `CalculationState` from the pure calculator.

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
  date: Date
}

interface ProductDefinition {
  id: InvestmentOptionId
  label: string
  monthlyRate: number
  taxable: boolean
}

interface ProductSimulationResult {
  row: ComparisonResult
  balances: number[]
  hasTaxablePositiveYieldLotUnder30Days: boolean
}

const MAX_MONEY = 999_999_999.99
const MAX_TERM_MONTHS = 600

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

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

function validateRateField(
  errors: InvestimentosErrors,
  field: keyof InvestimentosErrors,
  value: number | null,
  emptyMessage: string,
  minExclusive?: number,
  maxInclusive?: number
) {
  if (value === null || Number.isNaN(value)) {
    errors[field] = emptyMessage
    return
  }

  if (minExclusive !== undefined && value <= minExclusive) {
    errors[field] = emptyMessage
    return
  }

  if (maxInclusive !== undefined && value > maxInclusive) {
    errors[field] = emptyMessage
  }
}

function getCustomAnnualRate(normalized: NormalizedInvestimentosInputs): number {
  if (normalized.rateType === 'cdi_percent') {
    const cdiMonthly = annualToMonthlyRate(normalized.cdiAnnualRate)
    return Math.pow(1 + cdiMonthly * normalized.cdiFactor, 12) - 1
  }

  if (normalized.rateType === 'fixed') {
    return normalized.fixedAnnualRate
  }

  return (1 + normalized.ipcaAnnualRate) * (1 + normalized.ipcaSpreadAnnualRate) - 1
}

function simulateProduct(
  product: ProductDefinition,
  termMonths: number,
  initialAmount: number,
  monthlyContribution: number,
  startDate: Date
): ProductSimulationResult {
  const lots: Lot[] = []
  const balances: number[] = [roundCurrency(initialAmount)]

  if (initialAmount > 0) {
    lots.push({ principal: initialAmount, value: initialAmount, date: startDate })
  }

  for (let month = 1; month <= termMonths; month += 1) {
    for (const lot of lots) {
      lot.value *= 1 + product.monthlyRate
    }

    if (monthlyContribution > 0) {
      const contributionDate = addMonths(startDate, month)
      lots.push({
        principal: monthlyContribution,
        value: monthlyContribution,
        date: contributionDate,
      })
    }

    balances.push(roundCurrency(lots.reduce((sum, lot) => sum + lot.value, 0)))
  }

  const investedTotal = initialAmount + monthlyContribution * termMonths
  const grossFinalValue = lots.reduce((sum, lot) => sum + lot.value, 0)
  const grossYield = Math.max(0, grossFinalValue - investedTotal)
  const redemptionDate = addMonths(startDate, termMonths)

  let tax = 0
  let hasTaxablePositiveYieldLotUnder30Days = false
  if (product.taxable) {
    for (const lot of lots) {
      const elapsedDays = daysBetween(lot.date, redemptionDate)
      const lotYield = Math.max(0, lot.value - lot.principal)
      if (lotYield <= 0) continue
      if (elapsedDays < 30) {
        hasTaxablePositiveYieldLotUnder30Days = true
      }
      tax += lotYield * getIrRateByDays(elapsedDays)
    }
  }

  const netFinalValue = grossFinalValue - tax
  const netYield = netFinalValue - investedTotal

  return {
    row: {
      id: product.id,
      label: product.label,
      grossFinalValue: roundCurrency(grossFinalValue),
      investedTotal: roundCurrency(investedTotal),
      grossYield: roundCurrency(grossYield),
      tax: roundCurrency(tax),
      netFinalValue: roundCurrency(netFinalValue),
      netYield: roundCurrency(netYield),
      netDifferenceFromCustom: 0,
      isBest: false,
    },
    balances,
    hasTaxablePositiveYieldLotUnder30Days,
  }
}

function buildSimulation(
  termMonths: number,
  customBalances: number[],
  savingsBalances: number[],
  cdbBalances: number[],
  lciBalances: number[]
): SimulationPoint[] {
  const points: SimulationPoint[] = []
  for (let month = 0; month <= termMonths; month += 1) {
    points.push({
      month,
      customGross: customBalances[month],
      savingsGross: savingsBalances[month],
      cdb100CdiGross: cdbBalances[month],
      lciLca85CdiGross: lciBalances[month],
    })
  }
  return points
}

function calculateRealGainEstimate(
  normalized: NormalizedInvestimentosInputs,
  customNetFinalValue: number
): number {
  if (normalized.rateType !== 'ipca_plus') return 0

  const monthlyIpca = annualToMonthlyRate(normalized.ipcaAnnualRate)
  let correctedInvested = normalized.initialAmount * Math.pow(1 + monthlyIpca, normalized.termMonths)

  if (normalized.monthlyContribution > 0) {
    for (let month = 1; month <= normalized.termMonths; month += 1) {
      const ageMonths = normalized.termMonths - month
      correctedInvested += normalized.monthlyContribution * Math.pow(1 + monthlyIpca, ageMonths)
    }
  }

  return roundCurrency(customNetFinalValue - correctedInvested)
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

  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > MAX_TERM_MONTHS) {
    errors.termValue = 'Informe um prazo valido.'
  }

  validateRateField(errors, 'cdiAnnualPercent', inputs.cdiAnnualPercent, 'Informe o CDI anual.', -0.0000001, 100)
  validateRateField(errors, 'ipcaAnnualPercent', inputs.ipcaAnnualPercent, 'Informe o IPCA anual.', -99.99, 100)

  if (inputs.rateType === 'cdi_percent') {
    validateRateField(errors, 'cdiPercent', inputs.cdiPercent, 'Informe o percentual do CDI.', -0.0000001, 1000)
  }

  if (inputs.rateType === 'fixed') {
    validateRateField(errors, 'fixedAnnualPercent', inputs.fixedAnnualPercent, 'Informe a taxa prefixada.', -99.99, 100)
  }

  if (inputs.rateType === 'ipca_plus') {
    validateRateField(
      errors,
      'ipcaSpreadAnnualPercent',
      inputs.ipcaSpreadAnnualPercent,
      'Informe a taxa real acima do IPCA.',
      -99.99,
      100
    )
  }

  if (Object.keys(errors).length > 0) {
    return { normalized: null, errors }
  }

  return {
    normalized: {
      initialAmount: inputs.initialAmount,
      hasMonthlyContribution: inputs.hasMonthlyContribution,
      monthlyContribution,
      termMonths,
      cdiAnnualRate: (inputs.cdiAnnualPercent ?? 0) / 100,
      ipcaAnnualRate: (inputs.ipcaAnnualPercent ?? 0) / 100,
      rateType: inputs.rateType,
      cdiFactor: (inputs.cdiPercent ?? 0) / 100,
      fixedAnnualRate: (inputs.fixedAnnualPercent ?? 0) / 100,
      ipcaSpreadAnnualRate: (inputs.ipcaSpreadAnnualPercent ?? 0) / 100,
      isTaxExempt: inputs.isTaxExempt,
      startDate,
    },
    errors: {},
  }
}

export function calculateInvestimentos(inputs: InvestimentosInputs, startDate = new Date()): CalculationState {
  const normalizedState = normalizeInputs(inputs, startDate)
  if (!normalizedState.normalized) {
    return { result: null, errors: normalizedState.errors }
  }

  const normalized = normalizedState.normalized
  const customAnnualRate = getCustomAnnualRate(normalized)
  const customMonthlyRate = annualToMonthlyRate(customAnnualRate)
  const cdbMonthlyRate = annualToMonthlyRate(normalized.cdiAnnualRate)
  const lciMonthlyRate = cdbMonthlyRate * 0.85
  const savingsMonthlyRate = calculateSavingsMonthlyRate(normalized.cdiAnnualRate)

  const products: ProductDefinition[] = [
    {
      id: 'custom',
      label: 'Seu investimento',
      monthlyRate: customMonthlyRate,
      taxable: !normalized.isTaxExempt,
    },
    {
      id: 'savings',
      label: 'Poupanca simplificada (CDI proxy, TR=0)',
      monthlyRate: savingsMonthlyRate,
      taxable: false,
    },
    {
      id: 'cdb_100_cdi',
      label: 'CDB 100% CDI',
      monthlyRate: cdbMonthlyRate,
      taxable: true,
    },
    {
      id: 'lci_lca_85_cdi',
      label: 'LCI/LCA hipotetica 85% CDI',
      monthlyRate: lciMonthlyRate,
      taxable: false,
    },
  ]

  const simulationByProduct = products.map(product =>
    simulateProduct(
      product,
      normalized.termMonths,
      normalized.initialAmount,
      normalized.monthlyContribution,
      normalized.startDate
    )
  )

  const custom = simulationByProduct[0]
  const savings = simulationByProduct[1]
  const cdb = simulationByProduct[2]
  const lci = simulationByProduct[3]

  const customNet = custom.row.netFinalValue
  const rows = simulationByProduct.map((item): ComparisonResult => ({
    ...item.row,
    netDifferenceFromCustom: roundCurrency(item.row.netFinalValue - customNet),
    isBest: false,
  }))

  const bestNet = Math.max(...rows.map(row => row.netFinalValue))
  const bestOptionIds: InvestmentOptionId[] = []
  for (const row of rows) {
    if (Math.abs(row.netFinalValue - bestNet) < 0.005) {
      row.isBest = true
      bestOptionIds.push(row.id)
    }
  }

  const warnings: string[] = []
  if (simulationByProduct.some(item => item.hasTaxablePositiveYieldLotUnder30Days)) {
    warnings.push('IOF nao considerado para lotes com menos de 30 dias.')
  }

  const result: CalculationResult = {
    rows,
    simulation: buildSimulation(
      normalized.termMonths,
      custom.balances,
      savings.balances,
      cdb.balances,
      lci.balances
    ),
    bestOptionIds,
    realGainEstimate:
      normalized.rateType === 'ipca_plus'
        ? calculateRealGainEstimate(normalized, custom.row.netFinalValue)
        : undefined,
    baseDate: normalized.startDate,
    warnings,
  }

  return {
    result,
    errors: {},
  }
}

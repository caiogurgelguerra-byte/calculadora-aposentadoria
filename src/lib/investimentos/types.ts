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
  | 'cdbPercent'
  | 'lciLcaPercent'
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
  cdbPercent: number | null
  lciLcaPercent: number | null
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
  cdbFactor: number
  lciLcaFactor: number
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

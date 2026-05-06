export interface SalarioInputs {
  salarioBruto: number
  dependentes: number
  incluiDecimo: boolean
  showComparativo: boolean
}

export interface SalarioResult {
  bruto: number
  inss: number
  baseIRRF: number
  irrf: number
  liquido: number
}

export interface DecimoResult {
  bruto: number
  inss: number
  irrf: number
  liquido: number
}

export interface ComparativoRow {
  bruto: number
  inss: number
  irrf: number
  liquido: number
  percentualDesconto: number
  isCurrentSalary: boolean
}

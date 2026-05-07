export interface SalarioInputs {
  salarioBruto: number
  dependentes: number
  incluiDecimo: boolean
  showComparativo: boolean
  outrosDescontos: number
  beneficios: number
  horasExtras50: number
  horasExtras100: number
}

export interface SalarioResult {
  bruto: number
  valorHE: number
  brutoTotal: number
  inss: number
  baseIRRF: number
  irrf: number
  outrosDescontos: number
  beneficios: number
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

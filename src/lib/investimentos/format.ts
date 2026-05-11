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
  return value
    .toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .replace(/\u00a0/g, ' ')
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`
}

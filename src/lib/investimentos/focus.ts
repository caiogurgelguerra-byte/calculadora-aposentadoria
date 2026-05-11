const FOCUS_ANNUAL_ENDPOINT =
  "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$top=2000&$orderby=Data%20desc&$format=json&$select=Indicador,Data,DataReferencia,Mediana&$filter=Indicador%20eq%20'Selic'"

const FALLBACK_PROJECTED_CDI_BY_YEAR: Record<number, number> = {}

interface FocusAnnualEntry {
  Indicador?: string
  Data?: string
  DataReferencia?: string
  Mediana?: number | string
}

interface FocusAnnualResponse {
  value?: FocusAnnualEntry[]
}

function parseYear(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parseMedian(value: number | string | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function mapLatestSelicMediansByYear(entries: FocusAnnualEntry[]): Record<number, number> {
  const projectedByYear: Record<number, { date: string; median: number }> = {}

  for (const entry of entries) {
    if (entry.Indicador !== 'Selic') continue

    const year = parseYear(entry.DataReferencia)
    const median = parseMedian(entry.Mediana)
    const date = entry.Data ?? ''
    if (year === null || median === null || !date) continue

    const previous = projectedByYear[year]
    if (!previous || date > previous.date) {
      projectedByYear[year] = { date, median }
    }
  }

  return Object.fromEntries(
    Object.entries(projectedByYear).map(([year, value]) => [Number(year), value.median])
  )
}

export async function fetchLatestProjectedCdiByYear(
  fetchImpl: typeof fetch = fetch
): Promise<Record<number, number>> {
  const response = await fetchImpl(FOCUS_ANNUAL_ENDPOINT)
  if (!response.ok) {
    throw new Error(`Focus request failed with status ${response.status}`)
  }

  const data = (await response.json()) as FocusAnnualResponse
  const projected = mapLatestSelicMediansByYear(data.value ?? [])
  return Object.keys(projected).length > 0 ? projected : FALLBACK_PROJECTED_CDI_BY_YEAR
}

export function getFallbackProjectedCdiByYear(): Record<number, number> {
  return FALLBACK_PROJECTED_CDI_BY_YEAR
}

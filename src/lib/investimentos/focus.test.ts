import { describe, expect, it, vi } from 'vitest'
import {
  getFallbackProjectedCdiByYear,
  mapLatestSelicMediansByYear,
  resolveProjectedCdiByYear,
} from './focus'

describe('mapLatestSelicMediansByYear', () => {
  it('keeps the most recent median for each year', () => {
    const projected = mapLatestSelicMediansByYear([
      { Indicador: 'Selic', Data: '2026-05-10', DataReferencia: '2026', Mediana: 12.5 },
      { Indicador: 'Selic', Data: '2026-05-11', DataReferencia: '2026', Mediana: 13 },
      { Indicador: 'Selic', Data: '2026-05-11', DataReferencia: '2027', Mediana: '11.5' },
    ])

    expect(projected).toEqual({
      2026: 13,
      2027: 11.5,
    })
  })
})

describe('getFallbackProjectedCdiByYear', () => {
  it('returns a non-empty multi-year local fallback', () => {
    const projected = getFallbackProjectedCdiByYear(new Date(2026, 4, 11))

    expect(projected).toEqual({
      2026: 10,
      2027: 10,
      2028: 10,
      2029: 10,
      2030: 10,
    })
  })
})

describe('resolveProjectedCdiByYear', () => {
  it('uses local fallback when public fetch is disabled', async () => {
    const fetchImpl = vi.fn()
    const resolution = await resolveProjectedCdiByYear({
      enablePublicFetch: false,
      fetchImpl,
      now: new Date(2026, 4, 11),
    })

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(resolution.source).toBe('local_default')
    expect(resolution.projectedByYear[2026]).toBe(10)
  })

  it('uses BCB focus data when enabled and available', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        value: [{ Indicador: 'Selic', Data: '2026-05-11', DataReferencia: '2026', Mediana: 13 }],
      }),
    })

    const resolution = await resolveProjectedCdiByYear({
      enablePublicFetch: true,
      fetchImpl,
      now: new Date(2026, 4, 11),
    })

    expect(resolution.source).toBe('bcb_focus')
    expect(resolution.projectedByYear).toEqual({ 2026: 13 })
  })

  it('falls back to local default when remote fetch fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'))
    const resolution = await resolveProjectedCdiByYear({
      enablePublicFetch: true,
      fetchImpl,
      now: new Date(2026, 4, 11),
    })

    expect(resolution.source).toBe('local_default_unavailable')
    expect(resolution.projectedByYear[2026]).toBe(10)
  })
})

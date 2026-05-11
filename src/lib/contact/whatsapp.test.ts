import { describe, expect, it } from 'vitest'
import { whatsappUrl } from './whatsapp'

describe('whatsappUrl', () => {
  it('uses the public WhatsApp number for direct contact', () => {
    expect(whatsappUrl('duvida_geral')).toBe('https://wa.me/5584996654671')
  })
})

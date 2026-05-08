import { describe, it, expect } from 'vitest';
import { normalizePhoneToE164 } from './phone-parser';

describe('normalizePhoneToE164', () => {
  it('aceita E.164 puro', () => {
    expect(normalizePhoneToE164('+5511987654321')).toBe('+5511987654321');
  });

  it('aceita formato com máscara', () => {
    expect(normalizePhoneToE164('+55 (11) 98765-4321')).toBe('+5511987654321');
  });

  it('aceita só DDD + número', () => {
    expect(normalizePhoneToE164('11 98765-4321')).toBe('+5511987654321');
    expect(normalizePhoneToE164('11987654321')).toBe('+5511987654321');
  });

  it('aceita formato com parênteses sem DDI', () => {
    expect(normalizePhoneToE164('(11) 98765-4321')).toBe('+5511987654321');
  });

  it('aceita números fixos de 10 dígitos (8 após DDD)', () => {
    expect(normalizePhoneToE164('1133334444')).toBe('+551133334444');
  });

  it('retorna null para input inválido', () => {
    expect(normalizePhoneToE164('abc')).toBeNull();
    expect(normalizePhoneToE164('123')).toBeNull();
    expect(normalizePhoneToE164('')).toBeNull();
  });

  it('rejeita DDD com zero (00, 09)', () => {
    expect(normalizePhoneToE164('00987654321')).toBeNull();
    expect(normalizePhoneToE164('09987654321')).toBeNull();
  });
});

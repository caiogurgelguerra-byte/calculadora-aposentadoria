import { describe, it, expect } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('retorna / quando input é null/undefined/vazio', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext('')).toBe('/');
  });

  it('aceita path relativo válido', () => {
    expect(safeNext('/admin')).toBe('/admin');
    expect(safeNext('/aguardando')).toBe('/aguardando');
  });

  it('rejeita URL absoluta', () => {
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext('http://evil.com/path')).toBe('/');
  });

  it('rejeita protocol-relative //evil.com', () => {
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('//evil.com/admin')).toBe('/');
  });

  it('rejeita path com whitespace ou backslash', () => {
    expect(safeNext('/path with space')).toBe('/');
    expect(safeNext('/path\\evil')).toBe('/');
    expect(safeNext('/path\nevil')).toBe('/');
  });

  it('rejeita path que não começa com /', () => {
    expect(safeNext('admin')).toBe('/');
    expect(safeNext('javascript:alert(1)')).toBe('/');
  });
});

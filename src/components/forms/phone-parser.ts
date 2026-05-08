const E164_BR = /^\+55[1-9][1-9]\d{8,9}$/;

export function normalizePhoneToE164(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, '');
  let normalized: string;

  if (digits.length === 10 || digits.length === 11) {
    normalized = `+55${digits}`;
  } else if (digits.length === 12 || digits.length === 13) {
    if (!digits.startsWith('55')) return null;
    normalized = `+${digits}`;
  } else {
    return null;
  }
  return E164_BR.test(normalized) ? normalized : null;
}

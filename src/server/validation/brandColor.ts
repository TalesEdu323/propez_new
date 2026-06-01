const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

export function normalizeHexColor(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  const trimmed = value.trim();
  if (!isValidHexColor(trimmed)) return null;
  return trimmed.toLowerCase();
}

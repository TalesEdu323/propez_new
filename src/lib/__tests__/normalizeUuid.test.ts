import { describe, expect, it } from 'vitest';
import { normalizeUuidOrNull } from '../normalizeUuid';

describe('normalizeUuidOrNull', () => {
  const valid = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

  it('returns null for empty or whitespace', () => {
    expect(normalizeUuidOrNull('')).toBeNull();
    expect(normalizeUuidOrNull('   ')).toBeNull();
    expect(normalizeUuidOrNull(undefined)).toBeNull();
    expect(normalizeUuidOrNull(null)).toBeNull();
  });

  it('returns uuid when valid', () => {
    expect(normalizeUuidOrNull(valid)).toBe(valid);
  });

  it('returns null for non-uuid strings', () => {
    expect(normalizeUuidOrNull('not-a-uuid')).toBeNull();
    expect(normalizeUuidOrNull('123')).toBeNull();
  });
});

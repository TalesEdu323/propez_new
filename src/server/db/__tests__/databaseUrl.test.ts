import { describe, expect, it } from 'vitest';
import { databaseUrlNeedsSsl, normalizeDatabaseUrl } from '../databaseUrl.js';

describe('normalizeDatabaseUrl', () => {
  it('troca sslmode=require por verify-full', () => {
    const url = 'postgresql://u:p@host/db?sslmode=require';
    expect(normalizeDatabaseUrl(url)).toBe('postgresql://u:p@host/db?sslmode=verify-full');
  });

  it('preserva verify-full existente', () => {
    const url = 'postgresql://u:p@host/db?sslmode=verify-full';
    expect(normalizeDatabaseUrl(url)).toBe(url);
  });

  it('troca require quando há outros query params', () => {
    const url = 'postgresql://u:p@host/db?channel_binding=require&sslmode=require';
    expect(normalizeDatabaseUrl(url)).toBe(
      'postgresql://u:p@host/db?channel_binding=require&sslmode=verify-full',
    );
  });
});

describe('databaseUrlNeedsSsl', () => {
  it('detecta verify-full e neon', () => {
    expect(databaseUrlNeedsSsl('postgresql://x/neondb?sslmode=verify-full')).toBe(true);
    expect(databaseUrlNeedsSsl('postgresql://ep-pooler.us-east-2.aws.neon.tech/neondb')).toBe(true);
  });

  it('ignora localhost sem sslmode', () => {
    expect(databaseUrlNeedsSsl('postgresql://localhost:5432/dev')).toBe(false);
  });
});

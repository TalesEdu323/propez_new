import { describe, expect, it } from 'vitest';
import { JsonNotSerializableError, assertJsonSerializable, toJsonbParam } from '../jsonbParam.js';

describe('assertJsonSerializable', () => {
  it('aceita objetos normais', () => {
    expect(() => assertJsonSerializable({ a: 1 }, 'test')).not.toThrow();
  });

  it('rejeita referências circulares', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => assertJsonSerializable(circular, 'elementos')).toThrow(JsonNotSerializableError);
  });
});

describe('toJsonbParam', () => {
  it('serializa JSON válido', () => {
    expect(toJsonbParam([{ id: '1' }], 'elementos')).toBe('[{"id":"1"}]');
  });
});

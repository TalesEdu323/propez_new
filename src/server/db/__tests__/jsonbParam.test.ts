import { describe, expect, it } from 'vitest';
import { toJsonbParam } from '../jsonbParam.js';

describe('toJsonbParam', () => {
  it('serializa array vazio', () => {
    expect(toJsonbParam([])).toBe('[]');
  });

  it('serializa objeto aninhado parseável', () => {
    const value = {
      id: 'el-1',
      type: 'heading',
      props: { text: 'Título', level: 1 },
      children: [{ id: 'el-2', type: 'paragraph', props: { text: 'Corpo' } }],
    };
    const json = toJsonbParam(value);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json)).toEqual(value);
  });

  it('lança erro claro para BigInt', () => {
    expect(() => toJsonbParam({ n: BigInt(1) })).toThrow(/JSON não serializável/);
  });

  it('serializa null como JSON null', () => {
    expect(toJsonbParam(null)).toBe('null');
  });
});

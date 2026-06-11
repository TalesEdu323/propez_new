import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../apiClient';
import { store, upsertContratoCache, type ContratoTemplate } from '../store';

const base: ContratoTemplate = {
  id: 'c-test-upsert-1',
  titulo: 'Contrato teste',
  texto: '',
  sourceType: 'pdf',
  pdfPath: 'https://abc.public.blob.vercel-storage.com/x.pdf',
  pdfFileName: 'x.pdf',
  pageCount: 1,
  data_criacao: '2026-01-01',
};

describe('upsertContratoCache', () => {
  beforeEach(() => {
    vi.spyOn(api, 'post').mockResolvedValue({} as never);
    vi.spyOn(api, 'patch').mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('atualiza cache local sem chamar API', () => {
    upsertContratoCache(base);

    expect(store.getContratos().find((c) => c.id === base.id)).toEqual(base);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('substitui contrato existente no cache', () => {
    upsertContratoCache(base);
    const updated = { ...base, titulo: 'Atualizado' };
    upsertContratoCache(updated);

    expect(store.getContratos().find((c) => c.id === base.id)).toEqual(updated);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });
});

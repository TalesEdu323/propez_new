import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../apiClient';
import {
  formatStoreSaveError,
  notifyStoreSaveError,
  subscribeStoreSaveErrors,
} from '../storeSaveFeedback';

describe('storeSaveFeedback', () => {
  it('formats ApiError message', () => {
    const err = new ApiError(400, 'Dados inválidos', { error: 'Dados inválidos' });
    expect(formatStoreSaveError(err)).toBe('Dados inválidos');
  });

  it('formats 504 with mensagem amigável', () => {
    const err = new ApiError(504, 'Gateway Timeout');
    expect(formatStoreSaveError(err)).toContain('servidor demorou');
  });

  it('formats 500 with mensagem do body quando disponível', () => {
    const err = new ApiError(500, 'Internal Server Error', {
      error: 'Contrato ou serviço vinculado não existe mais. Atualize o modelo e tente novamente.',
    });
    expect(formatStoreSaveError(err)).toContain('Contrato ou serviço');
  });

  it('notifies subscribers with entity label', () => {
    const fn = vi.fn();
    const unsub = subscribeStoreSaveErrors(fn);
    notifyStoreSaveError('propez_clientes', 'create', new Error('falha de rede'));
    unsub();
    expect(fn).toHaveBeenCalledWith(
      expect.stringContaining('Não foi possível salvar o cliente'),
    );
    expect(fn.mock.calls[0][0]).toContain('falha de rede');
  });
});

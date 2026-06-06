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

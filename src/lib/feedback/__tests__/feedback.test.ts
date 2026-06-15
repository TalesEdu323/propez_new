import { describe, expect, it, vi } from 'vitest';
import { subscribeToasts, toast } from '../toastBus';
import { confirmAction, resolveConfirm, subscribeConfirm } from '../confirmBus';
import { storeSaveSuccessMessage } from '../messages';
import {
  notifyStoreSaveSuccess,
  pickAggregatedSaveOperation,
  subscribeStoreSaveSuccess,
} from '../../storeSaveFeedback';

describe('toastBus', () => {
  it('notifies subscribers with variant', () => {
    const fn = vi.fn();
    const unsub = subscribeToasts(fn);
    toast.success('Salvo');
    unsub();
    expect(fn).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Salvo', variant: 'success' }),
    );
  });
});

describe('confirmBus', () => {
  it('resolves true when confirmed', async () => {
    const pending = vi.fn();
    const unsub = subscribeConfirm(pending);
    const promise = confirmAction({ title: 'Excluir?' });
    expect(pending).toHaveBeenCalled();
    resolveConfirm(true);
    await expect(promise).resolves.toBe(true);
    unsub();
  });

  it('resolves false when cancelled', async () => {
    subscribeConfirm(() => {});
    const promise = confirmAction({ title: 'Excluir?' });
    resolveConfirm(false);
    await expect(promise).resolves.toBe(false);
  });
});

describe('messages', () => {
  it('builds success copy per operation', () => {
    expect(storeSaveSuccessMessage('propez_servicos', 'create')).toBe('Serviço salvo com sucesso');
    expect(storeSaveSuccessMessage('propez_clientes', 'delete')).toBe('Cliente excluído com sucesso');
  });
});

describe('storeSaveSuccess', () => {
  it('notifies subscribers for catalog keys', () => {
    const fn = vi.fn();
    const unsub = subscribeStoreSaveSuccess(fn);
    notifyStoreSaveSuccess('propez_modelos', 'update');
    unsub();
    expect(fn).toHaveBeenCalledWith('Modelo atualizado com sucesso');
  });

  it('aggregates batch operations with delete priority', () => {
    expect(pickAggregatedSaveOperation(['update', 'create'])).toBe('create');
    expect(pickAggregatedSaveOperation(['update', 'delete'])).toBe('delete');
  });
});

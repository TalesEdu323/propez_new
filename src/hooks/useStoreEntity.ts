import { useSyncExternalStore, useCallback } from 'react';
import {
  store,
  subscribeToStore,
  type StoreKey,
  type Cliente,
  type Servico,
  type ModeloProposta,
  type Proposta,
  type ContratoTemplate,
  type UserConfig,
} from '../lib/store';

/**
 * Cache de snapshots estáveis por chave.
 *
 * useSyncExternalStore exige que getSnapshot retorne a MESMA referência
 * enquanto os dados não mudam. Como os getters do store fazem JSON.parse
 * a cada chamada, cacheamos o resultado e invalidamos no listener
 * disparado por subscribeToStore / evento storage.
 */
const cache = new Map<StoreKey, unknown>();

function getCachedSnapshot<T>(key: StoreKey, read: () => T): T {
  if (!cache.has(key)) {
    cache.set(key, read());
  }
  return cache.get(key) as T;
}

function invalidate(key: StoreKey) {
  cache.delete(key);
}

function useStoreKey<T>(key: StoreKey, read: () => T): T {
  const subscribe = useCallback((listener: () => void) => {
    return subscribeToStore(key, () => {
      invalidate(key);
      listener();
    });
  }, [key]);

  const getSnapshot = useCallback(() => getCachedSnapshot(key, read), [key, read]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useClientes(): Cliente[] {
  return useStoreKey('propez_clientes', store.getClientes);
}

export function useServicos(): Servico[] {
  return useStoreKey('propez_servicos', store.getServicos);
}

export function useModelos(): ModeloProposta[] {
  return useStoreKey('propez_modelos', store.getModelos);
}

export function usePropostas(): Proposta[] {
  return useStoreKey('propez_propostas', store.getPropostas);
}

export function useContratos(): ContratoTemplate[] {
  return useStoreKey('propez_contratos', store.getContratos);
}

export function useUserConfig(): UserConfig {
  return useStoreKey('propez_user_config', store.getUserConfig);
}

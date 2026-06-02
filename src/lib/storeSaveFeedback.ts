import { ApiError } from './apiClient';

export type StoreSaveOperation = 'create' | 'update' | 'delete';

const ENTITY_LABELS: Record<string, string> = {
  propez_clientes: 'cliente',
  propez_servicos: 'serviço',
  propez_modelos: 'modelo',
  propez_propostas: 'proposta',
  propez_contratos: 'contrato',
};

const OP_LABELS: Record<StoreSaveOperation, string> = {
  create: 'salvar',
  update: 'atualizar',
  delete: 'excluir',
};

type SaveErrorListener = (message: string) => void;

const listeners = new Set<SaveErrorListener>();

export function subscribeStoreSaveErrors(listener: SaveErrorListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function formatStoreSaveError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body;
    if (body && typeof body === 'object' && 'details' in body) {
      return `${err.message} (${JSON.stringify((body as { details: unknown }).details)})`;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Erro desconhecido ao sincronizar com o servidor';
}

export function notifyStoreSaveError(
  storeKey: string,
  operation: StoreSaveOperation,
  err: unknown,
): void {
  const entity = ENTITY_LABELS[storeKey] ?? 'registro';
  const op = OP_LABELS[operation];
  const detail = formatStoreSaveError(err);
  const message = `Não foi possível ${op} o ${entity}. ${detail}`;
  console.error(`[store] ${storeKey} ${operation} falhou:`, err);
  listeners.forEach((fn) => {
    try {
      fn(message);
    } catch {
      /* ignore listener errors */
    }
  });
}

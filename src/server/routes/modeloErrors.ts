import { JsonNotSerializableError } from '../db/jsonbParam.js';
import { extractPgError } from '../services/apiErrorRequestContext.js';
import { ModeloReferenceError } from './modeloPersistHelpers.js';

function isConnectionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND' || e.code === 'ETIMEDOUT') return true;
  if (typeof e.code === 'string' && e.code.startsWith('08')) return true;
  if (err instanceof Error && err.cause) return isConnectionError(err.cause);
  return false;
}

/** Mapeamento de erros Postgres/API para respostas de save de modelo. */
export function modeloErrorResponse(err: unknown): { status: number; error: string } {
  if (err instanceof ModeloReferenceError) {
    return { status: 400, error: err.message };
  }
  if (err instanceof JsonNotSerializableError) {
    return {
      status: 400,
      error: 'Dados do layout contêm valores inválidos. Recarregue a página e tente salvar novamente.',
    };
  }
  if (err instanceof Error && err.message.startsWith('JSON não serializável')) {
    return {
      status: 400,
      error: 'Dados do layout contêm valores inválidos. Recarregue a página e tente salvar novamente.',
    };
  }
  if (err instanceof Error && err.message.includes("reading '_zod'")) {
    return {
      status: 400,
      error: 'Dados do modelo em formato inválido. Recarregue a página e tente novamente.',
    };
  }

  if (isConnectionError(err)) {
    return {
      status: 503,
      error: 'Banco de dados indisponível. Tente novamente em alguns segundos.',
    };
  }

  const pg = extractPgError(err);
  if (pg?.code === '23503') {
    return {
      status: 400,
      error: 'Contrato ou serviço vinculado não existe mais. Atualize o modelo e tente novamente.',
    };
  }
  if (pg?.code === '23505') {
    return {
      status: 409,
      error: 'Este modelo já existe. Recarregue a página e tente novamente.',
    };
  }
  if (pg?.code === '23514') {
    return {
      status: 400,
      error: 'Dados do modelo violam uma regra do banco. Verifique contrato, serviços e fluxo.',
    };
  }
  if (pg?.code === '23502') {
    return {
      status: 400,
      error: 'Campo obrigatório ausente nos dados do modelo. Recarregue a página e tente novamente.',
    };
  }
  if (pg?.code === '42703') {
    return {
      status: 503,
      error: 'Banco de dados desatualizado. Contate o suporte para aplicar as migrações.',
    };
  }
  if (pg?.code === '42P01') {
    return {
      status: 503,
      error: 'Banco de dados desatualizado. Contate o suporte para aplicar as migrações.',
    };
  }
  if (pg?.code === '22P02' || pg?.code === '42804' || pg?.code === '22P05') {
    return {
      status: 400,
      error: 'Dados do modelo em formato inválido. Recarregue a página e tente novamente.',
    };
  }
  if (pg?.code === '57014') {
    return {
      status: 504,
      error: 'O servidor demorou para salvar. Tente novamente em alguns segundos.',
    };
  }
  return { status: 500, error: 'Erro ao salvar modelo. Tente novamente em alguns segundos.' };
}

export const MODELO_MAX_PAYLOAD_BYTES = 4_000_000;

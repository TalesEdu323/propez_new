import type { BuilderElement } from '../types/builder';
import { api, ApiError } from './apiClient';
import { store } from './store';

export interface IaContractResult {
  titulo: string;
  texto: string;
}

export interface IaLayoutResult {
  elementos: BuilderElement[];
}

export interface IaErrorBody {
  error?: string;
  code?: string;
  requiredPlan?: string;
  retryAfter?: number;
}

function bumpLocalIaUsage(): void {
  const cfg = store.getUserConfig();
  const usage = cfg.usage ?? {
    propostasThisMonth: 0,
    iaGeracoesThisMonth: 0,
    rubricaAssinaturasThisMonth: 0,
    monthKey: new Date().toISOString().slice(0, 7),
  };
  store.saveUserConfig({
    ...cfg,
    usage: { ...usage, iaGeracoesThisMonth: usage.iaGeracoesThisMonth + 1 },
  });
}

async function postIa<T>(path: string, prompt: string): Promise<T> {
  try {
    const result = await api.post<T>(`/api/ia/${path}`, { prompt });
    bumpLocalIaUsage();
    return result;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'Falha ao gerar com IA');
  }
}

export const iaApi = {
  generateLayout: (prompt: string) => postIa<IaLayoutResult>('generate-layout', prompt),
  generateContract: (prompt: string) => postIa<IaContractResult>('generate-contract', prompt),
};

export function getIaErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as IaErrorBody | undefined;
    return body?.error ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Não foi possível gerar. Tente novamente.';
}

import type { PlanTier } from '../lib/featureFlags';

export function getIaRequiredPlan(err: unknown): PlanTier | undefined {
  if (err instanceof ApiError) {
    const body = err.body as IaErrorBody | undefined;
    const p = body?.requiredPlan;
    if (p === 'pro' || p === 'business' || p === 'free') return p;
  }
  return undefined;
}

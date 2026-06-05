import type { BuilderElement, BuilderPageLayout } from '../types/builder';
import { api, ApiError } from './apiClient';
import { store } from './store';

export interface IaContractResult {
  titulo: string;
  texto: string;
}

export interface IaLayoutResult {
  elementos: BuilderElement[];
  pageLayout?: BuilderPageLayout;
  offerType?: import('./layoutContext').OfferType;
}

export interface IaGenerateImageResult {
  url: string;
  source: 'generate' | 'stock';
  width?: number;
  height?: number;
}

export interface IaErrorBody {
  error?: string;
  code?: string;
  requiredPlan?: string;
  retryAfter?: number;
}

export interface GenerateContractOptions {
  useCompanyProfile?: boolean;
}

export interface GenerateLayoutOptions {
  useCompanyProfile?: boolean;
}

export interface GenerateImageOptions {
  width?: number;
  height?: number;
  negativePrompt?: string;
  source?: 'generate' | 'stock';
  offerType?: import('./layoutContext').OfferType;
  slot?: 'hero_banner' | 'card' | 'inline' | 'avatar' | 'gallery' | 'carousel';
}

export interface ResolveModelImagesOptions {
  brief?: string;
  offerType?: import('./layoutContext').OfferType;
  modelName?: string;
  serviceNames?: string[];
  globalPrompt?: string;
  imagePrompts?: Record<string, string>;
  regenerate?: 'all' | string[];
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

async function postIa<T>(path: string, body: Record<string, unknown>): Promise<T> {
  try {
    const result = await api.post<T>(`/api/ia/${path}`, body);
    bumpLocalIaUsage();
    return result;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'Falha ao gerar com IA');
  }
}

async function postIaNoUsage<T>(path: string, body: Record<string, unknown>): Promise<T> {
  try {
    return await api.post<T>(`/api/ia/${path}`, body);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'Falha na requisição de imagem');
  }
}

export const iaApi = {
  generateLayout: (prompt: string, options?: GenerateLayoutOptions) =>
    postIa<IaLayoutResult>('generate-layout', {
      prompt,
      useCompanyProfile: options?.useCompanyProfile ?? false,
    }),
  generateContract: (prompt: string, options?: GenerateContractOptions) =>
    postIa<IaContractResult>('generate-contract', {
      prompt,
      useCompanyProfile: options?.useCompanyProfile ?? true,
    }),
  generateImage: (prompt: string, options?: GenerateImageOptions) =>
    postIaNoUsage<IaGenerateImageResult>('generate-image', {
      prompt,
      width: options?.width,
      height: options?.height,
      negativePrompt: options?.negativePrompt,
      source: options?.source ?? 'generate',
      offerType: options?.offerType,
      slot: options?.slot,
    }),
  resolveModelImages: (elementos: BuilderElement[], options?: ResolveModelImagesOptions) =>
    postIaNoUsage<{ elementos: BuilderElement[]; offerType?: import('./layoutContext').OfferType }>(
      'resolve-model-images',
      {
        elementos,
        brief: options?.brief,
        offerType: options?.offerType,
        modelName: options?.modelName,
        serviceNames: options?.serviceNames,
        globalPrompt: options?.globalPrompt,
        imagePrompts: options?.imagePrompts,
        regenerate: options?.regenerate,
      },
    ),
};

export function getIaErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as IaErrorBody | undefined;
    const base = body?.error ?? err.message;
    if (body?.code === 'validation_failed' && err.status === 422) {
      return `${base} Inclua escopo, prazos, investimento e tipo de serviço na descrição.`;
    }
    return base;
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

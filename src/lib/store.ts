/**
 * Propez data store (frontend).
 *
 * Arquitetura:
 * - Cache em memória alimentado pelo backend via `hydrateStore()` após login.
 * - Leituras sempre síncronas (`store.getClientes()` etc.) para compatibilidade
 *   com hooks `useSyncExternalStore` que já usam esta API.
 * - Escritas (`store.saveClientes(list)`) aplicam diff contra o cache e
 *   disparam chamadas CRUD para o backend. Atualizações otimistas + reconciliação
 *   com as respostas (para adotar UUIDs gerados pelo servidor).
 * - `getUserConfig()` deriva de organization + usage; `saveUserConfig()` faz
 *   PATCH em `/api/organizations/current`.
 *
 * A interface pública foi mantida para evitar migração massiva das páginas.
 * Código novo deve preferir os helpers explícitos (`createCliente`, etc.).
 */
import type { BuilderElement, BuilderPageLayout } from '../types/builder';
import { normalizePageLayout } from './pageLayout';
import {
  resolveContratoTextoForApi,
  sanitizePageLayoutForApi,
  sanitizeWhatsappComprovante,
  stripElementosForApi,
  warnIfElementosPayloadLarge,
} from './sanitizeModeloPayload';
import type { ProposalFlowConfig } from '../types/proposalFlow';
import { api, ApiError } from './apiClient';
import { normalizeUuidOrNull } from './normalizeUuid';
import { notifyStoreSaveError } from './storeSaveFeedback';
import {
  getSession,
  patchOrganization,
  subscribeSession,
  type CurrentOrg,
} from './authSession';

import {
  getCurrentMonthKey,
  resolvePlan,
  type PlanTier,
  type PlanUsage,
  type UserConfig as PlanUserConfig,
} from './planConfig.js';

export { getCurrentMonthKey, resolvePlan };
export type { PlanTier, PlanUsage };

/** Config do usuário no frontend (campos obrigatórios após login). */
export interface UserConfig extends PlanUserConfig {
  nome: string;
  cnpj: string;
  onboarded: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  data_cadastro: string;
}

export interface Servico {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  tipo: 'unico' | 'recorrente';
  contratoId?: string;
  elementos?: BuilderElement[];
}

export interface ContratoTemplate {
  id: string;
  titulo: string;
  texto: string;
  sourceType?: 'text' | 'pdf';
  pdfFileName?: string;
  pageCount?: number;
  signatureConfig?: unknown;
  data_criacao: string;
}

export interface ModeloProposta {
  id: string;
  nome: string;
  elementos: BuilderElement[];
  pageLayout?: BuilderPageLayout;
  servicos: string[];
  contratoTexto?: string;
  contratoId?: string;
  chavePix?: string;
  linkPagamento?: string;
  whatsappComprovante?: string;
  fluxo?: ProposalFlowConfig;
  signatureConfig?: unknown;
  data_criacao: string;
  tier?: PlanTier;
}

export interface Proposta {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  clienteEmail?: string;
  modelo_id?: string;
  servicos: string[];
  valor: number;
  desconto?: number;
  recorrente?: boolean;
  ciclo_recorrencia?: string;
  duracao_recorrencia?: number;
  data_envio?: string;
  data_validade?: string;
  viewedAt?: string;
  status: 'pendente' | 'aprovada' | 'recusada';
  data_criacao: string;
  elementos: BuilderElement[];
  pageLayout?: BuilderPageLayout;
  contratoTexto?: string;
  contratoId?: string;
  chavePix?: string;
  linkPagamento?: string;
  whatsappComprovante?: string;
  pago: boolean;
  data_pagamento?: string;
  prosyncLeadId?: string;
  contractSignDocumentId?: string;
  contractSignStatus?: 'pending' | 'sent' | 'signed' | 'cancelled' | 'failed';
  contractSigningUrl?: string;
  contractSignedPdfPath?: string;
  contractSignLastSyncAt?: string;
  creatorPlan?: PlanTier;
  publicToken?: string;
  fluxo?: ProposalFlowConfig;
  clienteContratoRecebidoAt?: string;
  orgContratoAceitoAt?: string;
  contratoConcluidoAt?: string;
}

export type StoreKey =
  | 'propez_user_config'
  | 'propez_clientes'
  | 'propez_servicos'
  | 'propez_modelos'
  | 'propez_propostas'
  | 'propez_contratos';

type Listener = () => void;

const listeners: Map<StoreKey, Set<Listener>> = new Map();

function notify(key: StoreKey) {
  const bucket = listeners.get(key);
  if (bucket) bucket.forEach((listener) => listener());
}

export function subscribeToStore(key: StoreKey, listener: Listener): () => void {
  let bucket = listeners.get(key);
  if (!bucket) {
    bucket = new Set();
    listeners.set(key, bucket);
  }
  bucket.add(listener);
  return () => {
    bucket?.delete(listener);
  };
}

// ============================================================================
// Cache em memória
// ============================================================================
interface Caches {
  clientes: Cliente[];
  servicos: Servico[];
  modelos: ModeloProposta[];
  propostas: Proposta[];
  contratos: ContratoTemplate[];
  usage: PlanUsage;
}

function emptyUsage(): PlanUsage {
  return {
    propostasThisMonth: 0,
    iaGeracoesThisMonth: 0,
    rubricaAssinaturasThisMonth: 0,
    monthKey: getCurrentMonthKey(),
  };
}

const cache: Caches = {
  clientes: [],
  servicos: [],
  modelos: [],
  propostas: [],
  contratos: [],
  usage: emptyUsage(),
};

let hydrated = false;
let hydratePromise: Promise<void> | null = null;

export function isStoreHydrated(): boolean {
  return hydrated;
}

export function clearStore(): void {
  cache.clientes = [];
  cache.servicos = [];
  cache.modelos = [];
  cache.propostas = [];
  cache.contratos = [];
  cache.usage = emptyUsage();
  hydrated = false;
  hydratePromise = null;
  notify('propez_clientes');
  notify('propez_servicos');
  notify('propez_modelos');
  notify('propez_propostas');
  notify('propez_contratos');
  notify('propez_user_config');
}

subscribeSession(() => {
  if (!getSession()) {
    clearStore();
  }
});

// ----------------------------------------------------------------------------
// Tipos de response do backend (snake_case mesclado com camelCase nos nossos
// serializers). Aceitamos campos opcionais para robustez.
// ----------------------------------------------------------------------------
interface ApiCliente {
  id: string;
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  data_cadastro: string;
}
interface ApiServico {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  tipo: 'unico' | 'recorrente';
  contratoId?: string | null;
  elementos?: BuilderElement[];
}
interface ApiContrato {
  id: string;
  titulo: string;
  texto: string;
  sourceType?: 'text' | 'pdf';
  pdfFileName?: string | null;
  pageCount?: number | null;
  signatureConfig?: unknown;
  data_criacao: string;
}
interface ApiModelo {
  id: string;
  nome: string;
  elementos: BuilderElement[];
  pageLayout?: BuilderPageLayout;
  servicos: string[];
  contratoId?: string | null;
  contratoTexto?: string | null;
  chavePix?: string | null;
  linkPagamento?: string | null;
  whatsappComprovante?: string | null;
  tier: PlanTier;
  fluxo?: ProposalFlowConfig;
  signatureConfig?: unknown;
  data_criacao: string;
}
interface ApiProposta {
  id: string;
  cliente_id: string | null;
  cliente_nome: string;
  clienteEmail?: string | null;
  modelo_id?: string | null;
  servicos: string[];
  valor: number;
  desconto?: number;
  recorrente?: boolean;
  ciclo_recorrencia?: string | null;
  duracao_recorrencia?: number | null;
  data_envio?: string | null;
  data_validade?: string | null;
  status: 'pendente' | 'aprovada' | 'recusada';
  elementos: BuilderElement[];
  pageLayout?: BuilderPageLayout;
  contratoTexto?: string | null;
  contratoId?: string | null;
  chavePix?: string | null;
  linkPagamento?: string | null;
  whatsappComprovante?: string | null;
  pago: boolean;
  data_pagamento?: string | null;
  data_criacao: string;
  creatorPlan?: string | null;
  publicToken?: string | null;
  prosyncLeadId?: string | null;
  contractSignDocumentId?: string | null;
  contractSignStatus?: 'pending' | 'sent' | 'signed' | 'cancelled' | 'failed' | null;
  contractSigningUrl?: string | null;
  contractSignedPdfPath?: string | null;
  contractSignLastSyncAt?: string | null;
  rubricaDocumentId?: string | null;
  rubricaStatus?: 'pending' | 'sent' | 'signed' | 'cancelled' | 'failed' | null;
  rubricaSigningUrl?: string | null;
  rubricaSignedPdfUrl?: string | null;
  rubricaLastSyncAt?: string | null;
  fluxo?: ProposalFlowConfig;
  clienteContratoRecebidoAt?: string | null;
  orgContratoAceitoAt?: string | null;
  contratoConcluidoAt?: string | null;
}

function fromApiCliente(a: ApiCliente): Cliente {
  return {
    id: a.id,
    nome: a.nome ?? '',
    empresa: a.empresa ?? '',
    email: a.email ?? '',
    telefone: a.telefone ?? '',
    data_cadastro: a.data_cadastro ?? new Date().toISOString(),
  };
}
function fromApiServico(a: ApiServico): Servico {
  return {
    id: a.id,
    nome: a.nome ?? '',
    descricao: a.descricao ?? '',
    valor: Number(a.valor ?? 0),
    tipo: (a.tipo ?? 'unico') as 'unico' | 'recorrente',
    contratoId: a.contratoId ?? undefined,
    elementos: Array.isArray(a.elementos) ? a.elementos : [],
  };
}
function fromApiContrato(a: ApiContrato): ContratoTemplate {
  return {
    id: a.id,
    titulo: a.titulo,
    texto: a.texto ?? '',
    sourceType: a.sourceType ?? 'text',
    pdfFileName: a.pdfFileName ?? undefined,
    pageCount: a.pageCount ?? undefined,
    signatureConfig: a.signatureConfig ?? undefined,
    data_criacao: a.data_criacao,
  };
}
function fromApiModelo(a: ApiModelo): ModeloProposta {
  return {
    id: a.id,
    nome: a.nome,
    elementos: Array.isArray(a.elementos) ? a.elementos : [],
    pageLayout: normalizePageLayout(a.pageLayout),
    servicos: Array.isArray(a.servicos) ? a.servicos : [],
    contratoId: a.contratoId ?? undefined,
    contratoTexto: a.contratoTexto ?? undefined,
    chavePix: a.chavePix ?? undefined,
    linkPagamento: a.linkPagamento ?? undefined,
    whatsappComprovante: a.whatsappComprovante ?? undefined,
    tier: (a.tier ?? 'free') as PlanTier,
    fluxo: a.fluxo,
    signatureConfig: a.signatureConfig ?? undefined,
    data_criacao: a.data_criacao,
  };
}
function fromApiProposta(a: ApiProposta): Proposta {
  return {
    id: a.id,
    cliente_id: a.cliente_id ?? '',
    cliente_nome: a.cliente_nome ?? '',
    clienteEmail: a.clienteEmail?.trim() || undefined,
    modelo_id: a.modelo_id ?? undefined,
    servicos: Array.isArray(a.servicos) ? a.servicos : [],
    valor: Number(a.valor ?? 0),
    desconto: a.desconto != null ? Number(a.desconto) : undefined,
    recorrente: !!a.recorrente,
    ciclo_recorrencia: a.ciclo_recorrencia ?? undefined,
    duracao_recorrencia: a.duracao_recorrencia ?? undefined,
    data_envio: a.data_envio ?? undefined,
    data_validade: a.data_validade ?? undefined,
    status: a.status,
    elementos: Array.isArray(a.elementos) ? a.elementos : [],
    pageLayout: normalizePageLayout(a.pageLayout),
    contratoTexto: a.contratoTexto ?? undefined,
    contratoId: a.contratoId ?? undefined,
    chavePix: a.chavePix ?? undefined,
    linkPagamento: a.linkPagamento ?? undefined,
    whatsappComprovante: a.whatsappComprovante ?? undefined,
    pago: !!a.pago,
    data_pagamento: a.data_pagamento ?? undefined,
    data_criacao: a.data_criacao,
    creatorPlan: (a.creatorPlan as PlanTier | undefined) ?? undefined,
    publicToken: a.publicToken ?? undefined,
    prosyncLeadId: a.prosyncLeadId ?? undefined,
    contractSignDocumentId: a.contractSignDocumentId ?? undefined,
    contractSignStatus: a.contractSignStatus ?? undefined,
    contractSigningUrl: a.contractSigningUrl ?? undefined,
    contractSignedPdfPath: a.contractSignedPdfPath ?? undefined,
    contractSignLastSyncAt: a.contractSignLastSyncAt ?? undefined,
    fluxo: a.fluxo,
    clienteContratoRecebidoAt: a.clienteContratoRecebidoAt ?? undefined,
    orgContratoAceitoAt: a.orgContratoAceitoAt ?? undefined,
    contratoConcluidoAt: a.contratoConcluidoAt ?? undefined,
  };
}

// ============================================================================
// Hydration
// ============================================================================
export type HydrateStoreError = {
  entity: 'clientes' | 'servicos' | 'modelos' | 'propostas' | 'contratos' | 'usage';
  message: string;
};

let lastHydrateErrors: HydrateStoreError[] = [];

export function getLastHydrateErrors(): readonly HydrateStoreError[] {
  return lastHydrateErrors;
}

async function hydrateFetch<T>(
  entity: HydrateStoreError['entity'],
  url: string,
  fallback: T,
): Promise<T> {
  try {
    return await api.get<T>(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[hydrateStore] falha ao carregar ${entity}:`, err);
    lastHydrateErrors.push({ entity, message });
    return fallback;
  }
}

export async function hydrateStore(force = false): Promise<void> {
  if (hydrated && !force) return;
  if (!force && hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    lastHydrateErrors = [];
    const [clientes, servicos, modelos, propostas, contratos, usage] = await Promise.all([
      hydrateFetch<ApiCliente[]>('clientes', '/api/clientes', []),
      hydrateFetch<ApiServico[]>('servicos', '/api/servicos', []),
      hydrateFetch<ApiModelo[]>('modelos', '/api/modelos/summary', []),
      hydrateFetch<ApiProposta[]>('propostas', '/api/propostas/summary', []),
      hydrateFetch<ApiContrato[]>('contratos', '/api/contratos', []),
      hydrateFetch<PlanUsage>('usage', '/api/usage/current', emptyUsage()),
    ]);
    if (lastHydrateErrors.length > 0) {
      console.warn(
        '[hydrateStore] algumas entidades não carregaram; dados podem estar incompletos:',
        lastHydrateErrors.map((e) => e.entity).join(', '),
      );
    }
    cache.clientes = (clientes ?? []).map(fromApiCliente);
    cache.servicos = (servicos ?? []).map(fromApiServico);
    cache.modelos = (modelos ?? []).map(fromApiModelo);
    cache.propostas = (propostas ?? []).map(fromApiProposta);
    cache.contratos = (contratos ?? []).filter(Boolean).map(fromApiContrato);
    cache.usage = usage ?? emptyUsage();
    hydrated = true;
    notify('propez_clientes');
    notify('propez_servicos');
    notify('propez_modelos');
    notify('propez_propostas');
    notify('propez_contratos');
    notify('propez_user_config');
  })();
  return hydratePromise;
}

export async function refreshEntity(key: Exclude<StoreKey, 'propez_user_config'>): Promise<void> {
  switch (key) {
    case 'propez_clientes': {
      const list = await api.get<ApiCliente[]>('/api/clientes').catch(() => []);
      cache.clientes = (list ?? []).map(fromApiCliente);
      break;
    }
    case 'propez_servicos': {
      const list = await api.get<ApiServico[]>('/api/servicos').catch(() => []);
      cache.servicos = (list ?? []).map(fromApiServico);
      break;
    }
    case 'propez_modelos': {
      const list = await api.get<ApiModelo[]>('/api/modelos/summary').catch(() => []);
      cache.modelos = (list ?? []).map(fromApiModelo);
      break;
    }
    case 'propez_propostas': {
      const list = await api.get<ApiProposta[]>('/api/propostas/summary').catch(() => []);
      cache.propostas = (list ?? []).map(fromApiProposta);
      break;
    }
    case 'propez_contratos': {
      const list = await api.get<ApiContrato[]>('/api/contratos').catch(() => []);
      cache.contratos = (list ?? []).filter(Boolean).map(fromApiContrato);
      break;
    }
  }
  notify(key);
}

// ============================================================================
// Diff engine genérico
// ============================================================================
function jsonEquals(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

interface EntityApi<T extends { id: string }, TPayload = T> {
  create: (item: TPayload) => Promise<T>;
  update: (id: string, patch: TPayload) => Promise<T>;
  delete: (id: string) => Promise<void>;
  toPayload: (item: T) => TPayload;
}

function replaceCacheItem<T extends { id: string }>(list: T[], oldId: string, next: T): T[] {
  const idx = list.findIndex((i) => i.id === oldId);
  if (idx === -1) return [next, ...list];
  const copy = list.slice();
  copy[idx] = next;
  return copy;
}

function removeCacheItem<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((i) => i.id !== id);
}

function mergeModeloAfterSave(local: ModeloProposta, api: ModeloProposta): ModeloProposta {
  return {
    ...local,
    id: api.id,
    nome: api.nome ?? local.nome,
    servicos: api.servicos?.length ? api.servicos : local.servicos,
    contratoId: api.contratoId ?? local.contratoId,
    chavePix: api.chavePix ?? local.chavePix,
    linkPagamento: api.linkPagamento ?? local.linkPagamento,
    whatsappComprovante: api.whatsappComprovante ?? local.whatsappComprovante,
    tier: api.tier ?? local.tier,
    fluxo: api.fluxo ?? local.fluxo,
    data_criacao: api.data_criacao ?? local.data_criacao,
    elementos: local.elementos,
    pageLayout: local.pageLayout,
    contratoTexto: local.contratoTexto,
    signatureConfig: local.signatureConfig,
  };
}

async function postModeloWithRetry(body: Record<string, unknown>): Promise<ApiModelo> {
  const delays = [0, 1000, 3000];
  let lastErr: unknown;
  for (const delay of delays) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      return await api.post<ApiModelo>('/api/modelos', body);
    } catch (err) {
      lastErr = err;
      if (!(err instanceof ApiError) || ![502, 503, 504].includes(err.status)) throw err;
    }
  }
  throw lastErr;
}

async function patchModeloWithRetry(id: string, body: Record<string, unknown>): Promise<ApiModelo> {
  const delays = [0, 1000, 3000];
  let lastErr: unknown;
  for (const delay of delays) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      return await api.patch<ApiModelo>(`/api/modelos/${id}`, body);
    } catch (err) {
      lastErr = err;
      if (!(err instanceof ApiError) || ![502, 503, 504].includes(err.status)) throw err;
    }
  }
  throw lastErr;
}

async function diffSave<T extends { id: string }, TPayload>(
  key: Exclude<StoreKey, 'propez_user_config'>,
  getList: () => T[],
  setList: (v: T[]) => void,
  newList: T[],
  impl: EntityApi<T, TPayload>,
): Promise<{ failed: Array<{ id: string; err: unknown }> }> {
  const prev = getList();
  const prevById = new Map(prev.filter(Boolean).map((i) => [i.id, i] as const));
  const nextById = new Map(newList.filter(Boolean).map((i) => [i.id, i] as const));

  // Atualização otimista.
  setList(newList.slice());
  notify(key);

  const ops: Promise<void>[] = [];
  const failed: Array<{ id: string; err: unknown }> = [];

  // DELETEs
  for (const [id, deletedItem] of prevById) {
    if (!nextById.has(id)) {
      ops.push(
        impl
          .delete(id)
          .then(() => {
            setList(removeCacheItem(getList(), id));
            notify(key);
          })
          .catch((err) => {
            failed.push({ id, err });
            notifyStoreSaveError(key, 'delete', err);
            const current = getList();
            if (!current.some((i) => i.id === id)) {
              setList([deletedItem, ...current]);
              notify(key);
            }
          }),
      );
    }
  }

  // CREATE / UPDATE
  for (const [id, item] of nextById) {
    const prevItem = prevById.get(id);
    if (!prevItem) {
      ops.push(
        impl
          .create(impl.toPayload(item))
          .then((saved) => {
            const next =
              key === 'propez_modelos'
                ? mergeModeloAfterSave(item as ModeloProposta, saved as ModeloProposta)
                : saved;
            setList(replaceCacheItem(getList(), id, next));
            notify(key);
          })
          .catch((err) => {
            failed.push({ id, err });
            notifyStoreSaveError(key, 'create', err);
            setList(removeCacheItem(getList(), id));
            notify(key);
          }),
      );
    } else if (!jsonEquals(prevItem, item)) {
      ops.push(
        impl
          .update(id, impl.toPayload(item))
          .then((saved) => {
            const next =
              key === 'propez_modelos'
                ? mergeModeloAfterSave(item as ModeloProposta, saved as ModeloProposta)
                : saved;
            setList(replaceCacheItem(getList(), id, next));
            notify(key);
          })
          .catch((err) => {
            failed.push({ id, err });
            notifyStoreSaveError(key, 'update', err);
            setList(replaceCacheItem(getList(), id, prevItem));
            notify(key);
          }),
      );
    }
  }

  await Promise.allSettled(ops);
  return { failed };
}

// ============================================================================
// Implementações concretas por entidade
// ============================================================================
const clienteApi: EntityApi<Cliente, Partial<Cliente>> = {
  toPayload: (c) => ({
    nome: c.nome,
    empresa: c.empresa,
    email: c.email,
    telefone: c.telefone,
  }),
  create: async (p) => fromApiCliente(await api.post<ApiCliente>('/api/clientes', p as Record<string, unknown>)),
  update: async (id, p) => fromApiCliente(await api.patch<ApiCliente>(`/api/clientes/${id}`, p as Record<string, unknown>)),
  delete: async (id) => {
    await api.delete(`/api/clientes/${id}`);
  },
};

interface ServicoPayload {
  nome: string;
  descricao: string;
  valor: number;
  tipo: 'unico' | 'recorrente';
  contratoId?: string | null;
  elementos?: BuilderElement[];
}
const servicoApi: EntityApi<Servico, ServicoPayload> = {
  toPayload: (s) => ({
    nome: s.nome,
    descricao: s.descricao,
    valor: s.valor,
    tipo: s.tipo,
    contratoId: normalizeUuidOrNull(s.contratoId),
    elementos: s.elementos ?? [],
  }),
  create: async (p) => fromApiServico(await api.post<ApiServico>('/api/servicos', p as unknown as Record<string, unknown>)),
  update: async (id, p) => fromApiServico(await api.patch<ApiServico>(`/api/servicos/${id}`, p as unknown as Record<string, unknown>)),
  delete: async (id) => {
    await api.delete(`/api/servicos/${id}`);
  },
};

interface ContratoPayload {
  titulo: string;
  texto: string;
  sourceType?: 'text' | 'pdf';
  signatureConfig?: unknown | null;
}
const contratoApi: EntityApi<ContratoTemplate, ContratoPayload> = {
  toPayload: (c) => ({
    titulo: c.titulo,
    texto: c.texto,
    sourceType: c.sourceType ?? 'text',
    signatureConfig: c.signatureConfig ?? null,
  }),
  create: async (p) => fromApiContrato(await api.post<ApiContrato>('/api/contratos', p as unknown as Record<string, unknown>)),
  update: async (id, p) => fromApiContrato(await api.patch<ApiContrato>(`/api/contratos/${id}`, p as unknown as Record<string, unknown>)),
  delete: async (id) => {
    await api.delete(`/api/contratos/${id}`);
  },
};

interface ModeloPayload {
  id?: string;
  nome: string;
  elementos: BuilderElement[];
  pageLayout?: BuilderPageLayout;
  servicos: string[];
  contratoId?: string | null;
  contratoTexto?: string | null;
  chavePix?: string | null;
  linkPagamento?: string | null;
  whatsappComprovante?: string | null;
  tier: PlanTier;
  fluxo?: ProposalFlowConfig;
  signatureConfig?: unknown;
}
const modeloApi: EntityApi<ModeloProposta, ModeloPayload> = {
  toPayload: (m) => {
    const elementos = stripElementosForApi(m.elementos ?? []);
    warnIfElementosPayloadLarge(elementos);
    const contratoId = normalizeUuidOrNull(m.contratoId);
    const payload: ModeloPayload = {
      id: m.id,
      nome: m.nome,
      elementos,
      pageLayout: sanitizePageLayoutForApi(m.pageLayout ?? normalizePageLayout(null)),
      servicos: (m.servicos ?? [])
        .map((sid) => normalizeUuidOrNull(sid))
        .filter((sid): sid is string => sid !== null),
      contratoId,
      contratoTexto: resolveContratoTextoForApi(contratoId, m.contratoTexto ?? null),
      chavePix: m.chavePix ?? null,
      linkPagamento: m.linkPagamento ?? null,
      whatsappComprovante: sanitizeWhatsappComprovante(m.whatsappComprovante),
      tier: m.tier ?? 'free',
      fluxo: m.fluxo ?? { steps: ['approve', 'sign', 'pay'] },
    };
    if (m.signatureConfig != null) {
      payload.signatureConfig = m.signatureConfig;
    }
    return payload;
  },
  create: async (p) => fromApiModelo(await postModeloWithRetry(p as unknown as Record<string, unknown>)),
  update: async (id, p) =>
    fromApiModelo(await patchModeloWithRetry(id, p as unknown as Record<string, unknown>)),
  delete: async (id) => {
    await api.delete(`/api/modelos/${id}`);
  },
};

interface PropostaPayload {
  id?: string;
  cliente_id?: string | null;
  cliente_nome: string;
  clienteEmail?: string | null;
  modelo_id?: string | null;
  servicos: string[];
  valor: number;
  desconto?: number;
  recorrente?: boolean;
  ciclo_recorrencia?: string | null;
  duracao_recorrencia?: number | null;
  data_envio?: string | null;
  data_validade?: string | null;
  status: 'pendente' | 'aprovada' | 'recusada';
  elementos: BuilderElement[];
  pageLayout?: BuilderPageLayout;
  contratoTexto?: string | null;
  contratoId?: string | null;
  chavePix?: string | null;
  linkPagamento?: string | null;
  whatsappComprovante?: string | null;
  pago: boolean;
  data_pagamento?: string | null;
  creatorPlan?: PlanTier | null;
  prosyncLeadId?: string | null;
  fluxo?: ProposalFlowConfig;
}

function normalizeDateTimeOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Campos de formulario HTML date chegam como YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00.000Z`).toISOString();
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function toPropostaPayload(p: Proposta): PropostaPayload {
  return {
    id: p.id,
    cliente_id: normalizeUuidOrNull(p.cliente_id),
    cliente_nome: p.cliente_nome,
    clienteEmail: p.clienteEmail?.trim() || null,
    modelo_id: normalizeUuidOrNull(p.modelo_id),
    servicos: (p.servicos ?? [])
      .map((sid) => normalizeUuidOrNull(sid))
      .filter((sid): sid is string => sid !== null),
    valor: p.valor,
    desconto: p.desconto,
    recorrente: p.recorrente,
    ciclo_recorrencia: p.ciclo_recorrencia ?? null,
    duracao_recorrencia: p.duracao_recorrencia ?? null,
    data_envio: normalizeDateTimeOrNull(p.data_envio),
    data_validade: normalizeDateTimeOrNull(p.data_validade),
    status: p.status,
    elementos: p.elementos ?? [],
    pageLayout: p.pageLayout ?? normalizePageLayout(null),
    contratoTexto: p.contratoTexto ?? null,
    contratoId: normalizeUuidOrNull(p.contratoId),
    chavePix: p.chavePix ?? null,
    linkPagamento: p.linkPagamento ?? null,
    whatsappComprovante: p.whatsappComprovante ?? null,
    pago: p.pago,
    data_pagamento: normalizeDateTimeOrNull(p.data_pagamento),
    creatorPlan: p.creatorPlan ?? null,
    prosyncLeadId: p.prosyncLeadId ?? null,
    fluxo: p.fluxo ?? { steps: ['approve', 'sign', 'pay'] },
  };
}

const propostaApi: EntityApi<Proposta, PropostaPayload> = {
  toPayload: toPropostaPayload,
  create: async (p) => fromApiProposta(await api.post<ApiProposta>('/api/propostas', p as unknown as Record<string, unknown>)),
  update: async (id, p) => fromApiProposta(await api.patch<ApiProposta>(`/api/propostas/${id}`, p as unknown as Record<string, unknown>)),
  delete: async (id) => {
    await api.delete(`/api/propostas/${id}`);
  },
};

// ============================================================================
// UserConfig (derivado de organization + usage)
// ============================================================================
function buildUserConfig(org: CurrentOrg | null, usage: PlanUsage): UserConfig {
  if (!org) {
    return { nome: '', cnpj: '', onboarded: false, plan: 'free', usage };
  }
  return {
    nome: org.name ?? '',
    cnpj: org.cnpj ?? '',
    logo: org.logoUrl ?? undefined,
    assinatura: org.signatureUrl ?? undefined,
    primaryColor: org.primaryColor ?? undefined,
    secondaryColor: org.secondaryColor ?? undefined,
    whitelabelEnabled: org.whitelabelEnabled === true,
    onboarded: !!org.onboarded,
    segment: org.segment ?? undefined,
    plan: (org.plan ?? 'free') as PlanTier,
    planStartedAt: org.planStartedAt ?? undefined,
    planRenewsAt: org.planRenewsAt ?? undefined,
    trialEndsAt: org.trialEndsAt ?? undefined,
    billingCycle: (org.billingCycle ?? undefined) as UserConfig['billingCycle'],
    stripeCustomerId: org.stripeCustomerId ?? undefined,
    stripeSubscriptionId: org.stripeSubscriptionId ?? undefined,
    segment: org.segment ?? undefined,
    usage,
    isPro: (org.plan ?? 'free') !== 'free',
  };
}

async function pushOrgPatch(patch: Partial<UserConfig>): Promise<void> {
  const body: Record<string, unknown> = {};
  if ('nome' in patch) body.name = patch.nome;
  if ('cnpj' in patch) body.cnpj = patch.cnpj ?? null;
  if ('logo' in patch) body.logoUrl = patch.logo ?? null;
  if ('assinatura' in patch) body.signatureUrl = patch.assinatura ?? null;
  if ('onboarded' in patch) body.onboarded = patch.onboarded;
  if ('segment' in patch) body.segment = patch.segment ?? null;
  if (Object.keys(body).length === 0) return;
  try {
    const updated = await api.patch<{
      name: string;
      cnpj: string | null;
      logoUrl: string | null;
      signatureUrl: string | null;
      primaryColor: string | null;
      secondaryColor: string | null;
      whitelabelEnabled: boolean;
      onboarded: boolean;
      plan: PlanTier;
      billingCycle: 'monthly' | 'yearly' | null;
      trialEndsAt: string | null;
      planStartedAt: string | null;
      planRenewsAt: string | null;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      segment: import('./layoutContext').OfferType | null;
    }>('/api/organizations/current', body);
    patchOrganization({
      name: updated.name,
      cnpj: updated.cnpj,
      logoUrl: updated.logoUrl,
      signatureUrl: updated.signatureUrl,
      primaryColor: updated.primaryColor,
      secondaryColor: updated.secondaryColor,
      whitelabelEnabled: updated.whitelabelEnabled,
      onboarded: updated.onboarded,
      plan: updated.plan,
      billingCycle: updated.billingCycle,
      trialEndsAt: updated.trialEndsAt,
      planStartedAt: updated.planStartedAt,
      planRenewsAt: updated.planRenewsAt,
      stripeCustomerId: updated.stripeCustomerId,
      stripeSubscriptionId: updated.stripeSubscriptionId,
      segment: updated.segment ?? null,
    });
  } catch (err) {
    console.error('[store] saveUserConfig erro', err);
  }
}

// ============================================================================
// API pública (mantém a superfície histórica)
// ============================================================================
export const store = {
  getUserConfig: (): UserConfig => {
    const session = getSession();
    return buildUserConfig(session?.organization ?? null, cache.usage);
  },
  saveUserConfig: (config: UserConfig) => {
    // Sincroniza o cache local otimisticamente só para onboarded/trial que afetam routing.
    const session = getSession();
    if (session) {
      patchOrganization({
        name: config.nome,
        cnpj: config.cnpj || null,
        logoUrl: config.logo ?? null,
        signatureUrl: config.assinatura ?? null,
        onboarded: !!config.onboarded,
      });
    }
    if (config.usage) {
      cache.usage = { ...config.usage };
      notify('propez_user_config');
    }
    // Persiste no backend.
    void pushOrgPatch({
      nome: config.nome,
      cnpj: config.cnpj,
      logo: config.logo,
      assinatura: config.assinatura,
      onboarded: config.onboarded,
    });
    notify('propez_user_config');
  },
  ensureUsage: (): UserConfig => {
    const u = cache.usage;
    const current = getCurrentMonthKey();
    if (!u || u.monthKey !== current) {
      cache.usage = { ...emptyUsage(), monthKey: current };
      notify('propez_user_config');
    }
    return store.getUserConfig();
  },
  incrementUsage: (key: keyof Omit<PlanUsage, 'monthKey'>, delta = 1) => {
    cache.usage = { ...cache.usage, [key]: (cache.usage[key] ?? 0) + delta };
    notify('propez_user_config');
    const backendKey =
      key === 'propostasThisMonth'
        ? 'propostas'
        : key === 'iaGeracoesThisMonth'
          ? 'ia_geracoes'
          : 'rubrica_assinaturas';
    void api.post('/api/usage/increment', { key: backendKey, delta }).catch((err) => {
      console.error('[store] incrementUsage falhou', err);
    });
  },

  getClientes: (): Cliente[] => cache.clientes,
  saveClientes: (list: Cliente[]): void => {
    void diffSave(
      'propez_clientes',
      () => cache.clientes,
      (v) => {
        cache.clientes = v;
      },
      list,
      clienteApi,
    );
  },

  getServicos: (): Servico[] => cache.servicos,
  saveServicos: (list: Servico[]): void => {
    void diffSave(
      'propez_servicos',
      () => cache.servicos,
      (v) => {
        cache.servicos = v;
      },
      list,
      servicoApi,
    );
  },

  getModelos: (): ModeloProposta[] => cache.modelos,
  saveModelos: (list: ModeloProposta[]): void => {
    void diffSave(
      'propez_modelos',
      () => cache.modelos,
      (v) => {
        cache.modelos = v;
      },
      list,
      modeloApi,
    );
  },
  saveModelosAsync: async (list: ModeloProposta[]): Promise<void> => {
    const { failed } = await diffSave(
      'propez_modelos',
      () => cache.modelos,
      (v) => {
        cache.modelos = v;
      },
      list,
      modeloApi,
    );
    if (failed.length > 0) {
      throw failed[0].err;
    }
  },

  getPropostas: (): Proposta[] => cache.propostas,
  savePropostas: (list: Proposta[]): void => {
    void diffSave(
      'propez_propostas',
      () => cache.propostas,
      (v) => {
        cache.propostas = v;
      },
      list,
      propostaApi,
    );
  },

  getContratos: (): ContratoTemplate[] => cache.contratos,
  saveContratos: (list: ContratoTemplate[]): void => {
    void diffSave(
      'propez_contratos',
      () => cache.contratos,
      (v) => {
        cache.contratos = v;
      },
      list,
      contratoApi,
    );
  },
};

// ============================================================================
// Helpers explícitos (preferidos em código novo)
// ============================================================================

/**
 * Cria cliente, aguarda resposta do servidor com UUID final e atualiza cache.
 * Retorna o Cliente com id do servidor.
 */
export async function createCliente(input: Omit<Cliente, 'id' | 'data_cadastro'>): Promise<Cliente> {
  const saved = fromApiCliente(
    await api.post<ApiCliente>('/api/clientes', {
      nome: input.nome,
      empresa: input.empresa,
      email: input.email,
      telefone: input.telefone,
    }),
  );
  cache.clientes = [saved, ...cache.clientes];
  notify('propez_clientes');
  return saved;
}

export async function createProposta(input: Omit<Proposta, 'id' | 'data_criacao'>): Promise<Proposta> {
  const saved = fromApiProposta(
    await api.post<ApiProposta>('/api/propostas', toPropostaPayload(input as Proposta)),
  );
  cache.propostas = [saved, ...cache.propostas];
  notify('propez_propostas');
  return saved;
}

export async function updateProposta(id: string, patch: Partial<Proposta>): Promise<Proposta> {
  const saved = fromApiProposta(
    await api.patch<ApiProposta>(`/api/propostas/${id}`, toPropostaPayload({ id, ...patch } as Proposta)),
  );
  cache.propostas = cache.propostas.map((p) => (p.id === id ? saved : p));
  notify('propez_propostas');
  return saved;
}

/** Carrega modelo completo (com elementos) e atualiza o cache. */
export async function fetchModeloById(id: string): Promise<ModeloProposta | null> {
  try {
    const saved = fromApiModelo(await api.get<ApiModelo>(`/api/modelos/${id}`));
    const idx = cache.modelos.findIndex((m) => m.id === id);
    if (idx >= 0) {
      cache.modelos = cache.modelos.map((m) => (m.id === id ? saved : m));
    } else {
      cache.modelos = [saved, ...cache.modelos];
    }
    notify('propez_modelos');
    return saved;
  } catch (err) {
    console.error('[fetchModeloById] falha:', err);
    return null;
  }
}

/** Carrega proposta completa (com elementos) e atualiza o cache. */
export async function fetchPropostaById(id: string): Promise<Proposta | null> {
  try {
    const saved = fromApiProposta(await api.get<ApiProposta>(`/api/propostas/${id}`));
    const idx = cache.propostas.findIndex((p) => p.id === id);
    if (idx >= 0) {
      cache.propostas = cache.propostas.map((p) => (p.id === id ? saved : p));
    } else {
      cache.propostas = [saved, ...cache.propostas];
    }
    notify('propez_propostas');
    return saved;
  } catch (err) {
    console.error('[fetchPropostaById] falha:', err);
    return null;
  }
}

export async function generatePublicLink(
  propostaId: string,
): Promise<{ token: string; url: string }> {
  return api.post<{ token: string; url: string }>(`/api/propostas/${propostaId}/public-link`);
}

export async function sendProposalEmail(
  propostaId: string,
  email?: string,
): Promise<{ sent: boolean; to?: string }> {
  return api.post<{ sent: boolean; to?: string }>(`/api/propostas/${propostaId}/send-email`, {
    ...(email ? { email } : {}),
  });
}

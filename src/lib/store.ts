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
import type { BuilderElement } from '../types/builder';
import { api } from './apiClient';
import {
  getSession,
  patchOrganization,
  subscribeSession,
  type CurrentOrg,
} from './authSession';

export type PlanTier = 'free' | 'pro' | 'business';

export interface PlanUsage {
  propostasThisMonth: number;
  iaGeracoesThisMonth: number;
  rubricaAssinaturasThisMonth: number;
  /** ISO string do primeiro dia do mês que estamos contabilizando. */
  monthKey: string;
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
}

export interface ContratoTemplate {
  id: string;
  titulo: string;
  texto: string;
  data_criacao: string;
}

export interface ModeloProposta {
  id: string;
  nome: string;
  elementos: BuilderElement[];
  servicos: string[];
  contratoTexto?: string;
  contratoId?: string;
  chavePix?: string;
  linkPagamento?: string;
  data_criacao: string;
  tier?: PlanTier;
}

export interface Proposta {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  modelo_id?: string;
  servicos: string[];
  valor: number;
  desconto?: number;
  recorrente?: boolean;
  ciclo_recorrencia?: string;
  duracao_recorrencia?: number;
  data_envio?: string;
  data_validade?: string;
  status: 'pendente' | 'aprovada' | 'recusada';
  data_criacao: string;
  elementos: BuilderElement[];
  contratoTexto?: string;
  contratoId?: string;
  chavePix?: string;
  linkPagamento?: string;
  pago: boolean;
  data_pagamento?: string;
  prosyncLeadId?: string;
  rubricaDocumentId?: string;
  rubricaStatus?: 'pending' | 'sent' | 'signed' | 'cancelled' | 'failed';
  rubricaSigningUrl?: string;
  rubricaSignedPdfUrl?: string;
  rubricaLastSyncAt?: string;
  creatorPlan?: PlanTier;
  publicToken?: string;
}

export interface UserConfig {
  nome: string;
  cnpj: string;
  logo?: string;
  assinatura?: string;
  onboarded: boolean;
  plan?: PlanTier;
  planStartedAt?: string;
  planRenewsAt?: string;
  trialEndsAt?: string;
  billingCycle?: 'monthly' | 'yearly';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  usage?: PlanUsage;
  /** @deprecated Use `plan !== 'free'`. */
  isPro?: boolean;
}

export function getCurrentMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function resolvePlan(config: UserConfig | null | undefined): PlanTier {
  if (!config) return 'free';
  if (config.plan) return config.plan;
  if (config.isPro) return 'pro';
  return 'free';
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
}
interface ApiContrato {
  id: string;
  titulo: string;
  texto: string;
  data_criacao: string;
}
interface ApiModelo {
  id: string;
  nome: string;
  elementos: BuilderElement[];
  servicos: string[];
  contratoId?: string | null;
  contratoTexto?: string | null;
  chavePix?: string | null;
  linkPagamento?: string | null;
  tier: PlanTier;
  data_criacao: string;
}
interface ApiProposta {
  id: string;
  cliente_id: string | null;
  cliente_nome: string;
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
  contratoTexto?: string | null;
  contratoId?: string | null;
  chavePix?: string | null;
  linkPagamento?: string | null;
  pago: boolean;
  data_pagamento?: string | null;
  data_criacao: string;
  creatorPlan?: string | null;
  publicToken?: string | null;
  prosyncLeadId?: string | null;
  rubricaDocumentId?: string | null;
  rubricaStatus?: 'pending' | 'sent' | 'signed' | 'cancelled' | 'failed' | null;
  rubricaSigningUrl?: string | null;
  rubricaSignedPdfUrl?: string | null;
  rubricaLastSyncAt?: string | null;
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
  };
}
function fromApiContrato(a: ApiContrato): ContratoTemplate {
  return { id: a.id, titulo: a.titulo, texto: a.texto ?? '', data_criacao: a.data_criacao };
}
function fromApiModelo(a: ApiModelo): ModeloProposta {
  return {
    id: a.id,
    nome: a.nome,
    elementos: Array.isArray(a.elementos) ? a.elementos : [],
    servicos: Array.isArray(a.servicos) ? a.servicos : [],
    contratoId: a.contratoId ?? undefined,
    contratoTexto: a.contratoTexto ?? undefined,
    chavePix: a.chavePix ?? undefined,
    linkPagamento: a.linkPagamento ?? undefined,
    tier: (a.tier ?? 'free') as PlanTier,
    data_criacao: a.data_criacao,
  };
}
function fromApiProposta(a: ApiProposta): Proposta {
  return {
    id: a.id,
    cliente_id: a.cliente_id ?? '',
    cliente_nome: a.cliente_nome ?? '',
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
    contratoTexto: a.contratoTexto ?? undefined,
    contratoId: a.contratoId ?? undefined,
    chavePix: a.chavePix ?? undefined,
    linkPagamento: a.linkPagamento ?? undefined,
    pago: !!a.pago,
    data_pagamento: a.data_pagamento ?? undefined,
    data_criacao: a.data_criacao,
    creatorPlan: (a.creatorPlan as PlanTier | undefined) ?? undefined,
    publicToken: a.publicToken ?? undefined,
    prosyncLeadId: a.prosyncLeadId ?? undefined,
    rubricaDocumentId: a.rubricaDocumentId ?? undefined,
    rubricaStatus: a.rubricaStatus ?? undefined,
    rubricaSigningUrl: a.rubricaSigningUrl ?? undefined,
    rubricaSignedPdfUrl: a.rubricaSignedPdfUrl ?? undefined,
    rubricaLastSyncAt: a.rubricaLastSyncAt ?? undefined,
  };
}

// ============================================================================
// Hydration
// ============================================================================
export async function hydrateStore(force = false): Promise<void> {
  if (hydrated && !force) return;
  if (!force && hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const [clientes, servicos, modelos, propostas, contratos, usage] = await Promise.all([
      api.get<ApiCliente[]>('/api/clientes').catch(() => []),
      api.get<ApiServico[]>('/api/servicos').catch(() => []),
      api.get<ApiModelo[]>('/api/modelos').catch(() => []),
      api.get<ApiProposta[]>('/api/propostas').catch(() => []),
      api.get<ApiContrato[]>('/api/contratos').catch(() => []),
      api
        .get<PlanUsage>('/api/usage/current')
        .catch(() => emptyUsage()),
    ]);
    cache.clientes = (clientes ?? []).map(fromApiCliente);
    cache.servicos = (servicos ?? []).map(fromApiServico);
    cache.modelos = (modelos ?? []).map(fromApiModelo);
    cache.propostas = (propostas ?? []).map(fromApiProposta);
    cache.contratos = (contratos ?? []).map(fromApiContrato);
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
      const list = await api.get<ApiModelo[]>('/api/modelos').catch(() => []);
      cache.modelos = (list ?? []).map(fromApiModelo);
      break;
    }
    case 'propez_propostas': {
      const list = await api.get<ApiProposta[]>('/api/propostas').catch(() => []);
      cache.propostas = (list ?? []).map(fromApiProposta);
      break;
    }
    case 'propez_contratos': {
      const list = await api.get<ApiContrato[]>('/api/contratos').catch(() => []);
      cache.contratos = (list ?? []).map(fromApiContrato);
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

async function diffSave<T extends { id: string }, TPayload>(
  key: Exclude<StoreKey, 'propez_user_config'>,
  getList: () => T[],
  setList: (v: T[]) => void,
  newList: T[],
  impl: EntityApi<T, TPayload>,
): Promise<void> {
  const prev = getList();
  const prevById = new Map(prev.map((i) => [i.id, i] as const));
  const nextById = new Map(newList.map((i) => [i.id, i] as const));

  // Atualização otimista.
  setList(newList.slice());
  notify(key);

  const ops: Promise<void>[] = [];

  // DELETEs
  for (const [id] of prevById) {
    if (!nextById.has(id)) {
      ops.push(
        impl
          .delete(id)
          .then(() => {
            setList(removeCacheItem(getList(), id));
            notify(key);
          })
          .catch((err) => {
            console.error(`[store] ${key} delete falhou:`, err);
            // Rollback: recoloca no cache se apagamos otimisticamente e falhou
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
            setList(replaceCacheItem(getList(), id, saved));
            notify(key);
          })
          .catch((err) => {
            console.error(`[store] ${key} create falhou:`, err);
            setList(removeCacheItem(getList(), id));
            notify(key);
          }),
      );
    } else if (!jsonEquals(prevItem, item)) {
      ops.push(
        impl
          .update(id, impl.toPayload(item))
          .then((saved) => {
            setList(replaceCacheItem(getList(), id, saved));
            notify(key);
          })
          .catch((err) => {
            console.error(`[store] ${key} update falhou:`, err);
          }),
      );
    }
  }

  await Promise.allSettled(ops);
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
}
const servicoApi: EntityApi<Servico, ServicoPayload> = {
  toPayload: (s) => ({
    nome: s.nome,
    descricao: s.descricao,
    valor: s.valor,
    tipo: s.tipo,
    contratoId: s.contratoId ?? null,
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
}
const contratoApi: EntityApi<ContratoTemplate, ContratoPayload> = {
  toPayload: (c) => ({ titulo: c.titulo, texto: c.texto }),
  create: async (p) => fromApiContrato(await api.post<ApiContrato>('/api/contratos', p as unknown as Record<string, unknown>)),
  update: async (id, p) => fromApiContrato(await api.patch<ApiContrato>(`/api/contratos/${id}`, p as unknown as Record<string, unknown>)),
  delete: async (id) => {
    await api.delete(`/api/contratos/${id}`);
  },
};

interface ModeloPayload {
  nome: string;
  elementos: BuilderElement[];
  servicos: string[];
  contratoId?: string | null;
  contratoTexto?: string | null;
  chavePix?: string | null;
  linkPagamento?: string | null;
  tier: PlanTier;
}
const modeloApi: EntityApi<ModeloProposta, ModeloPayload> = {
  toPayload: (m) => ({
    nome: m.nome,
    elementos: m.elementos ?? [],
    servicos: m.servicos ?? [],
    contratoId: m.contratoId ?? null,
    contratoTexto: m.contratoTexto ?? null,
    chavePix: m.chavePix ?? null,
    linkPagamento: m.linkPagamento ?? null,
    tier: m.tier ?? 'free',
  }),
  create: async (p) => fromApiModelo(await api.post<ApiModelo>('/api/modelos', p as unknown as Record<string, unknown>)),
  update: async (id, p) => fromApiModelo(await api.patch<ApiModelo>(`/api/modelos/${id}`, p as unknown as Record<string, unknown>)),
  delete: async (id) => {
    await api.delete(`/api/modelos/${id}`);
  },
};

interface PropostaPayload {
  cliente_id?: string | null;
  cliente_nome: string;
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
  contratoTexto?: string | null;
  contratoId?: string | null;
  chavePix?: string | null;
  linkPagamento?: string | null;
  pago: boolean;
  data_pagamento?: string | null;
  creatorPlan?: PlanTier | null;
  prosyncLeadId?: string | null;
}

function toPropostaPayload(p: Proposta): PropostaPayload {
  return {
    cliente_id: p.cliente_id || null,
    cliente_nome: p.cliente_nome,
    modelo_id: p.modelo_id ?? null,
    servicos: p.servicos ?? [],
    valor: p.valor,
    desconto: p.desconto,
    recorrente: p.recorrente,
    ciclo_recorrencia: p.ciclo_recorrencia ?? null,
    duracao_recorrencia: p.duracao_recorrencia ?? null,
    data_envio: p.data_envio ?? null,
    data_validade: p.data_validade ?? null,
    status: p.status,
    elementos: p.elementos ?? [],
    contratoTexto: p.contratoTexto ?? null,
    contratoId: p.contratoId ?? null,
    chavePix: p.chavePix ?? null,
    linkPagamento: p.linkPagamento ?? null,
    pago: p.pago,
    data_pagamento: p.data_pagamento ?? null,
    creatorPlan: p.creatorPlan ?? null,
    prosyncLeadId: p.prosyncLeadId ?? null,
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
    onboarded: !!org.onboarded,
    plan: (org.plan ?? 'free') as PlanTier,
    planStartedAt: org.planStartedAt ?? undefined,
    planRenewsAt: org.planRenewsAt ?? undefined,
    trialEndsAt: org.trialEndsAt ?? undefined,
    billingCycle: (org.billingCycle ?? undefined) as UserConfig['billingCycle'],
    stripeCustomerId: org.stripeCustomerId ?? undefined,
    stripeSubscriptionId: org.stripeSubscriptionId ?? undefined,
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
  if (Object.keys(body).length === 0) return;
  try {
    const updated = await api.patch<{
      name: string;
      cnpj: string | null;
      logoUrl: string | null;
      signatureUrl: string | null;
      onboarded: boolean;
      plan: PlanTier;
      billingCycle: 'monthly' | 'yearly' | null;
      trialEndsAt: string | null;
      planStartedAt: string | null;
      planRenewsAt: string | null;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
    }>('/api/organizations/current', body);
    patchOrganization({
      name: updated.name,
      cnpj: updated.cnpj,
      logoUrl: updated.logoUrl,
      signatureUrl: updated.signatureUrl,
      onboarded: updated.onboarded,
      plan: updated.plan,
      billingCycle: updated.billingCycle,
      trialEndsAt: updated.trialEndsAt,
      planStartedAt: updated.planStartedAt,
      planRenewsAt: updated.planRenewsAt,
      stripeCustomerId: updated.stripeCustomerId,
      stripeSubscriptionId: updated.stripeSubscriptionId,
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

export async function generatePublicLink(
  propostaId: string,
): Promise<{ token: string; url: string }> {
  return api.post<{ token: string; url: string }>(`/api/propostas/${propostaId}/public-link`);
}

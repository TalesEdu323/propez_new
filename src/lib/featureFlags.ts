/**
 * Feature flags e limites por plano.
 *
 * Tudo relacionado a "o que cada plano pode fazer" passa por aqui.
 * Componentes consomem `canUse`, `canCreateProposal`, `getAllowedWidgets` etc.
 *
 * Mantenha este arquivo como ÚNICA fonte de verdade das travas — os preços e
 * descrições são usados tanto pela UI (página de planos / modal de upgrade)
 * quanto pelo servidor (valida limites no checkout).
 */

import type { BuilderElementType } from '../types/builder';
import { resolvePlan, type PlanTier, type UserConfig } from './store';

export type { PlanTier };

/** Conjunto de widgets básicos liberados no Free. */
export const FREE_WIDGETS: readonly BuilderElementType[] = [
  'heading', 'paragraph', 'button', 'image', 'divider', 'spacer',
  'card', 'grid', 'container', 'column', 'pricing', 'feature_grid',
];

/** Widgets intermediários adicionais no Pro (somados ao Free). */
export const PRO_ONLY_WIDGETS: readonly BuilderElementType[] = [
  'stats', 'testimonial', 'timeline', 'accordion', 'icon_list', 'navbar',
  'animated_text', 'tabs', 'progress_bar', 'star_rating', 'gallery',
  'countdown', 'whatsapp_button', 'image_carousel', 'comparison_table',
];

/** Widgets premium adicionais no Business (somados ao Pro). */
export const BUSINESS_ONLY_WIDGETS: readonly BuilderElementType[] = [
  'video', 'slider', 'funnel', 'google_map', 'toast_notification',
  'marketing_hero', 'marketing_context', 'marketing_strategy',
  'marketing_services', 'marketing_pricing', 'marketing_cta',
];

export interface PlanLimits {
  /** Propostas criadas por mês. `null` = ilimitado. */
  propostasPerMonth: number | null;
  clientes: number | null;
  modelosProprios: number | null;
  contratosProprios: number | null;
  iaGeracoesPerMonth: number | null;
  rubricaAssinaturasPerMonth: number | null;
  usuarios: number;
  exportPdf: boolean;
  watermark: boolean;
  whiteLabel: boolean;
  prosync: boolean;
  rubrica: boolean;
  stripePaymentLink: boolean;
  stripeRecurrence: boolean;
  analytics: 'none' | 'basic' | 'advanced';
  followUp: 'none' | 'single' | 'sequence';
  /** Widgets do builder disponíveis. */
  widgets: ReadonlySet<BuilderElementType>;
  /** Tiers de modelo que podem ser usados. */
  templateTiers: ReadonlySet<PlanTier>;
}

const FREE_LIMITS: PlanLimits = {
  propostasPerMonth: 3,
  clientes: 5,
  modelosProprios: 1,
  contratosProprios: 1,
  iaGeracoesPerMonth: 0,
  rubricaAssinaturasPerMonth: 0,
  usuarios: 1,
  exportPdf: false,
  watermark: true,
  whiteLabel: false,
  prosync: false,
  rubrica: false,
  stripePaymentLink: false,
  stripeRecurrence: false,
  analytics: 'none',
  followUp: 'none',
  widgets: new Set(FREE_WIDGETS),
  templateTiers: new Set<PlanTier>(['free']),
};

const PRO_LIMITS: PlanLimits = {
  propostasPerMonth: null,
  clientes: null,
  modelosProprios: 20,
  contratosProprios: 20,
  iaGeracoesPerMonth: 50,
  rubricaAssinaturasPerMonth: 20,
  usuarios: 1,
  exportPdf: true,
  watermark: false,
  whiteLabel: false,
  prosync: true,
  rubrica: true,
  stripePaymentLink: true,
  stripeRecurrence: false,
  analytics: 'basic',
  followUp: 'single',
  widgets: new Set<BuilderElementType>([...FREE_WIDGETS, ...PRO_ONLY_WIDGETS]),
  templateTiers: new Set<PlanTier>(['free', 'pro']),
};

const BUSINESS_LIMITS: PlanLimits = {
  propostasPerMonth: null,
  clientes: null,
  modelosProprios: null,
  contratosProprios: null,
  iaGeracoesPerMonth: null,
  rubricaAssinaturasPerMonth: null,
  usuarios: 5,
  exportPdf: true,
  watermark: false,
  whiteLabel: true,
  prosync: true,
  rubrica: true,
  stripePaymentLink: true,
  stripeRecurrence: true,
  analytics: 'advanced',
  followUp: 'sequence',
  widgets: new Set<BuilderElementType>([
    ...FREE_WIDGETS,
    ...PRO_ONLY_WIDGETS,
    ...BUSINESS_ONLY_WIDGETS,
  ]),
  templateTiers: new Set<PlanTier>(['free', 'pro', 'business']),
};

const LIMITS: Record<PlanTier, PlanLimits> = {
  free: FREE_LIMITS,
  pro: PRO_LIMITS,
  business: BUSINESS_LIMITS,
};

export function getPlanLimits(plan: PlanTier): PlanLimits {
  return LIMITS[plan];
}

export interface PlanMeta {
  id: PlanTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyMonthlyEquivalent: number;
  yearlyTotal: number;
  highlight?: boolean;
  badgeColor: string;
  accentClass: string;
}

export const PLAN_META: Record<PlanTier, PlanMeta> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Comece grátis',
    monthlyPrice: 0,
    yearlyMonthlyEquivalent: 0,
    yearlyTotal: 0,
    badgeColor: 'bg-zinc-100 text-zinc-600',
    accentClass: 'text-zinc-900',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Profissionalize seu processo',
    monthlyPrice: 89,
    yearlyMonthlyEquivalent: 69,
    yearlyTotal: 828,
    highlight: true,
    badgeColor: 'bg-amber-100 text-amber-700',
    accentClass: 'text-amber-600',
  },
  business: {
    id: 'business',
    name: 'Business',
    tagline: 'Agência e time',
    monthlyPrice: 249,
    yearlyMonthlyEquivalent: 199,
    yearlyTotal: 2388,
    badgeColor: 'bg-violet-100 text-violet-700',
    accentClass: 'text-violet-700',
  },
};

const PLAN_ORDER: PlanTier[] = ['free', 'pro', 'business'];

export function planAtLeast(plan: PlanTier, target: PlanTier): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(target);
}

/**
 * Menor plano que oferece um determinado widget.
 * Usado para sugerir "upgrade para Pro" em vez de sempre empurrar Business.
 */
export function getWidgetRequiredPlan(type: BuilderElementType): PlanTier {
  if (FREE_LIMITS.widgets.has(type)) return 'free';
  if (PRO_LIMITS.widgets.has(type)) return 'pro';
  return 'business';
}

export function getTemplateRequiredPlan(tier: PlanTier | undefined): PlanTier {
  return tier ?? 'free';
}

export function getAllowedWidgets(plan: PlanTier): ReadonlySet<BuilderElementType> {
  return LIMITS[plan].widgets;
}

export function isWidgetAllowed(plan: PlanTier, type: BuilderElementType): boolean {
  return LIMITS[plan].widgets.has(type);
}

export function isTemplateAllowed(plan: PlanTier, tier: PlanTier | undefined): boolean {
  return LIMITS[plan].templateTiers.has(tier ?? 'free');
}

export interface GateResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  limit?: number | null;
  requiredPlan?: PlanTier;
}

/**
 * Verifica se o usuário pode criar mais uma proposta neste mês.
 */
export function canCreateProposal(config: UserConfig | null | undefined): GateResult {
  const plan = resolvePlan(config);
  const limit = LIMITS[plan].propostasPerMonth;
  if (limit === null) return { allowed: true, remaining: Infinity, limit: null };
  const used = config?.usage?.propostasThisMonth ?? 0;
  const remaining = Math.max(0, limit - used);
  return {
    allowed: remaining > 0,
    reason: remaining > 0 ? undefined : `Você atingiu o limite de ${limit} propostas/mês do plano Free.`,
    remaining,
    limit,
    requiredPlan: remaining > 0 ? undefined : 'pro',
  };
}

export function canUsePdfExport(config: UserConfig | null | undefined): GateResult {
  const plan = resolvePlan(config);
  const allowed = LIMITS[plan].exportPdf;
  return {
    allowed,
    reason: allowed ? undefined : 'Exportação em PDF é um recurso Pro.',
    requiredPlan: allowed ? undefined : 'pro',
  };
}

export function canUseIa(config: UserConfig | null | undefined): GateResult {
  const plan = resolvePlan(config);
  const limit = LIMITS[plan].iaGeracoesPerMonth;
  if (limit === null) return { allowed: true };
  if (limit === 0) {
    return {
      allowed: false,
      reason: 'IA generativa está disponível a partir do plano Pro.',
      requiredPlan: 'pro',
    };
  }
  const used = config?.usage?.iaGeracoesThisMonth ?? 0;
  const remaining = Math.max(0, limit - used);
  return {
    allowed: remaining > 0,
    remaining,
    limit,
    reason: remaining > 0 ? undefined : `Você atingiu ${limit} gerações de IA este mês.`,
    requiredPlan: remaining > 0 ? undefined : 'business',
  };
}

export function canUseProsync(config: UserConfig | null | undefined): GateResult {
  const plan = resolvePlan(config);
  const allowed = LIMITS[plan].prosync;
  return {
    allowed,
    reason: allowed ? undefined : 'Integração ProSync CRM está disponível no plano Pro.',
    requiredPlan: allowed ? undefined : 'pro',
  };
}

export function canUseRubrica(config: UserConfig | null | undefined): GateResult {
  const plan = resolvePlan(config);
  const limit = LIMITS[plan].rubricaAssinaturasPerMonth;
  if (limit === null) return { allowed: true };
  if (limit === 0) {
    return {
      allowed: false,
      reason: 'Assinatura eletrônica (Rubrica) está disponível a partir do Pro.',
      requiredPlan: 'pro',
    };
  }
  const used = config?.usage?.rubricaAssinaturasThisMonth ?? 0;
  const remaining = Math.max(0, limit - used);
  return {
    allowed: remaining > 0,
    remaining,
    limit,
    reason: remaining > 0 ? undefined : `Você atingiu ${limit} assinaturas este mês.`,
    requiredPlan: remaining > 0 ? undefined : 'business',
  };
}

/**
 * Deve exibir marca d'água "Feito com Propez" no link público?
 * Respeita o plano do CRIADOR da proposta — não do visitante.
 */
export function shouldShowWatermark(creatorPlan: PlanTier | undefined): boolean {
  const plan: PlanTier = creatorPlan ?? 'free';
  return LIMITS[plan].watermark;
}

/**
 * Atalho genérico: aceita o nome da feature e despacha.
 */
export type FeatureKey =
  | 'proposta.create'
  | 'pdf.export'
  | 'ia.generate'
  | 'prosync'
  | 'rubrica';

export function canUse(feature: FeatureKey, config: UserConfig | null | undefined): GateResult {
  switch (feature) {
    case 'proposta.create': return canCreateProposal(config);
    case 'pdf.export': return canUsePdfExport(config);
    case 'ia.generate': return canUseIa(config);
    case 'prosync': return canUseProsync(config);
    case 'rubrica': return canUseRubrica(config);
  }
}

/**
 * Tipos e helpers de plano compartilhados entre frontend e servidor.
 * Arquivo sem dependências de React/API — seguro para import na Vercel (ESM).
 */

export type PlanTier = 'free' | 'pro' | 'business';

export interface PlanUsage {
  propostasThisMonth: number;
  iaGeracoesThisMonth: number;
  rubricaAssinaturasThisMonth: number;
  /** ISO string do primeiro dia do mês que estamos contabilizando. */
  monthKey: string;
}

export interface UserConfig {
  nome?: string;
  cnpj?: string;
  logo?: string;
  assinatura?: string;
  onboarded?: boolean;
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

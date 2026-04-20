/**
 * Event bus leve para solicitar navegação à página de planos.
 *
 * Por que não usar contexto? O componente `UpgradeGate` é usado em vários
 * pontos profundos da árvore (builder, wizard, link público). Em vez de
 * propagar `navigate` via props ou contexto, expomos um "canal" global para
 * que qualquer nó disparar uma solicitação.
 *
 * O `App` registra um listener via `subscribeToPlanosRequest` e, quando o
 * evento dispara, chama `navigate('planos')`.
 */

import type { PlanTier } from './store';

const EVENT_NAME = 'propez:navigate-planos';

export interface PlanosNavigationDetail {
  /** Plano-alvo sugerido (destaca o card correspondente). */
  targetPlan?: PlanTier;
  /** Feature que disparou a solicitação — opcional para analytics. */
  feature?: string;
}

export function requestPlanosNavigation(detail: PlanosNavigationDetail = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<PlanosNavigationDetail>(EVENT_NAME, { detail }));
}

export function subscribeToPlanosRequest(
  listener: (detail: PlanosNavigationDetail) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<PlanosNavigationDetail>;
    listener(custom.detail || {});
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

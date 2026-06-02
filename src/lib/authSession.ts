/**
 * Estado global da sessão autenticada.
 *
 * Fornece uma API simples (`getSession`, `subscribeSession`) e um hook React
 * (`useSession`) para consumuir usuário + organização correntes.
 *
 * A sessão é populada via `/api/auth/me` e invalidada no logout / 401 final.
 * Integra-se com `apiClient` para receber notificação quando o refresh falha
 * e precisamos deslogar o usuário.
 */
import { useSyncExternalStore } from 'react';
import { api, ApiError, subscribeRefreshFailure } from './apiClient';

import type { OfferType } from './layoutContext';

export type Role = 'owner' | 'admin' | 'member';
export type PlanTier = 'free' | 'pro' | 'business';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  isPlatformAdmin?: boolean;
  hasPassword?: boolean;
}

export interface CurrentOrg {
  id: string;
  name: string;
  cnpj: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  whitelabelEnabled: boolean;
  plan: PlanTier;
  billingCycle: 'monthly' | 'yearly' | null;
  trialEndsAt: string | null;
  planStartedAt: string | null;
  planRenewsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  onboarded: boolean;
  segment: OfferType | null;
  role: Role;
}

export interface AuthSession {
  user: CurrentUser;
  organization: CurrentOrg;
}

interface MeResponse {
  user: CurrentUser;
  organization: CurrentOrg;
}

let current: AuthSession | null = null;
let initialLoaded = false;

const listeners = new Set<() => void>();
const initialListeners = new Set<() => void>();

function notifySession() {
  listeners.forEach((l) => l());
}

function notifyInitial() {
  initialListeners.forEach((l) => l());
}

function markInitialLoaded(): void {
  if (initialLoaded) return;
  initialLoaded = true;
  notifyInitial();
}

export function getSession(): AuthSession | null {
  return current;
}

export function isInitialLoaded(): boolean {
  return initialLoaded;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeInitial(listener: () => void): () => void {
  initialListeners.add(listener);
  return () => initialListeners.delete(listener);
}

export function setSession(session: AuthSession | null): void {
  current = session;
  markInitialLoaded();
  notifySession();
}

export function patchOrganization(patch: Partial<CurrentOrg>): void {
  if (!current) return;
  current = { ...current, organization: { ...current.organization, ...patch } };
  notifySession();
}

export async function fetchSession(): Promise<AuthSession | null> {
  try {
    const data = await api.get<MeResponse>('/api/auth/me', { skipRefresh: false });
    setSession(data);
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      setSession(null);
      return null;
    }
    if (err instanceof ApiError && err.status === 404) {
      console.error(
        '[authSession] fetchSession: /api/auth/me retornou 404 — o backend Express não está a servir esta origem. ' +
          'Use `npm run dev` ou, após `npm run build`, `npm run preview` (não use `vite preview` sozinho: não inclui rotas /api).',
        err,
      );
    } else {
      console.error('[authSession] fetchSession error', err);
    }
    setSession(null);
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout', {}, { skipRefresh: true });
  } catch (err) {
    console.warn('[authSession] logout erro', err);
  }
  setSession(null);
}

subscribeRefreshFailure(() => {
  if (current) setSession(null);
});

const STORE = {
  getSnapshot: () => current,
  subscribe: subscribeSession,
};

export function useSession(): AuthSession | null {
  return useSyncExternalStore(STORE.subscribe, STORE.getSnapshot, STORE.getSnapshot);
}

export function useInitialLoaded(): boolean {
  return useSyncExternalStore(subscribeInitial, () => initialLoaded, () => initialLoaded);
}

export async function bootstrapSession(): Promise<AuthSession | null> {
  const result = await fetchSession();
  markInitialLoaded();
  return result;
}

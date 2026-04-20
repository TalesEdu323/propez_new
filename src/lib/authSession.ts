/**
 * Estado global da sessão autenticada.
 *
 * Fornece uma API simples (`getSession`, `subscribeSession`) e um hook React
 * (`useSession`) para consumir usuário + organização correntes.
 *
 * A sessão é populada via `/api/auth/me` e invalidada no logout / 401 final.
 * Integra-se com `apiClient` para receber notificação quando o refresh falha
 * e precisamos deslogar o usuário.
 */
import { useSyncExternalStore } from 'react';
import { api, ApiError, subscribeRefreshFailure } from './apiClient';

export type Role = 'owner' | 'admin' | 'member';
export type PlanTier = 'free' | 'pro' | 'business';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
}

export interface CurrentOrg {
  id: string;
  name: string;
  cnpj: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  plan: PlanTier;
  billingCycle: 'monthly' | 'yearly' | null;
  trialEndsAt: string | null;
  planStartedAt: string | null;
  planRenewsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  onboarded: boolean;
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

function notify() {
  listeners.forEach((l) => l());
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

export function setSession(session: AuthSession | null): void {
  current = session;
  initialLoaded = true;
  notify();
}

export function patchOrganization(patch: Partial<CurrentOrg>): void {
  if (!current) return;
  current = { ...current, organization: { ...current.organization, ...patch } };
  notify();
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
    console.error('[authSession] fetchSession error', err);
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

let initialLoadedFlag = false;
const initialListeners = new Set<() => void>();

export function subscribeInitial(listener: () => void): () => void {
  initialListeners.add(listener);
  return () => initialListeners.delete(listener);
}

export function useInitialLoaded(): boolean {
  return useSyncExternalStore(
    (l) => {
      initialListeners.add(l);
      return () => initialListeners.delete(l);
    },
    () => initialLoadedFlag,
    () => initialLoadedFlag,
  );
}

export async function bootstrapSession(): Promise<AuthSession | null> {
  const result = await fetchSession();
  initialLoadedFlag = true;
  initialListeners.forEach((l) => l());
  return result;
}

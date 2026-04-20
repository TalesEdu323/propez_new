/**
 * Cliente HTTP para o backend Propez.
 *
 * Responsabilidades:
 * - Envia `credentials: 'include'` para mandar os cookies httpOnly de auth.
 * - Faz refresh automático em 401 via `/api/auth/refresh`.
 * - Evita thundering herd: concorrentes compartilham o mesmo refresh em flight.
 * - Expõe `ApiError` com status para os chamadores lidarem com erros do servidor.
 */

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type FetchOpts = RequestInit & { skipRefresh?: boolean };

let inFlightRefresh: Promise<boolean> | null = null;

const REFRESH_LISTENERS = new Set<(ok: boolean) => void>();

export function subscribeRefreshFailure(fn: () => void): () => void {
  const wrapped = (ok: boolean) => {
    if (!ok) fn();
  };
  REFRESH_LISTENERS.add(wrapped);
  return () => REFRESH_LISTENERS.delete(wrapped);
}

async function doRefresh(): Promise<boolean> {
  if (!inFlightRefresh) {
    inFlightRefresh = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        const result = inFlightRefresh;
        inFlightRefresh = null;
        void result;
      });
  }
  const ok = await inFlightRefresh;
  REFRESH_LISTENERS.forEach((l) => l(ok));
  return ok;
}

async function rawFetch(url: string, opts: FetchOpts): Promise<Response> {
  const { skipRefresh: _skip, headers, body, ...rest } = opts;
  const h: Record<string, string> = { ...(headers as Record<string, string> | undefined) };
  const hasBody = body !== undefined && body !== null;
  if (hasBody && typeof body === 'string' && !h['Content-Type']) {
    h['Content-Type'] = 'application/json';
  }
  return fetch(url, {
    ...rest,
    body,
    headers: h,
    credentials: 'include',
  });
}

export async function apiFetch(url: string, opts: FetchOpts = {}): Promise<Response> {
  let res = await rawFetch(url, opts);
  if (res.status === 401 && !opts.skipRefresh) {
    const ok = await doRefresh();
    if (ok) {
      res = await rawFetch(url, opts);
    }
  }
  return res;
}

async function parseError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.clone().json();
  } catch {
    body = await res.text().catch(() => '');
  }
  const message =
    (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
      ? (body as { error: string }).error
      : null) || res.statusText || `HTTP ${res.status}`;
  return new ApiError(res.status, message, body);
}

export async function apiJson<T = unknown>(url: string, opts: FetchOpts = {}): Promise<T> {
  const res = await apiFetch(url, opts);
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

type JsonBody = Record<string, unknown> | unknown[] | null;

function withJson(body: JsonBody): string | undefined {
  if (body === null || body === undefined) return undefined;
  return JSON.stringify(body);
}

export const api = {
  get: <T>(url: string, opts: FetchOpts = {}) => apiJson<T>(url, { ...opts, method: 'GET' }),
  post: <T>(url: string, body?: JsonBody, opts: FetchOpts = {}) =>
    apiJson<T>(url, { ...opts, method: 'POST', body: withJson(body ?? null) }),
  patch: <T>(url: string, body?: JsonBody, opts: FetchOpts = {}) =>
    apiJson<T>(url, { ...opts, method: 'PATCH', body: withJson(body ?? null) }),
  put: <T>(url: string, body?: JsonBody, opts: FetchOpts = {}) =>
    apiJson<T>(url, { ...opts, method: 'PUT', body: withJson(body ?? null) }),
  delete: <T>(url: string, opts: FetchOpts = {}) => apiJson<T>(url, { ...opts, method: 'DELETE' }),
};

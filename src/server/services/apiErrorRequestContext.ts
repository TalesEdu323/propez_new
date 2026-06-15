const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'authorization',
  'chavepix',
  'chave_pix',
  'apikey',
  'api_key',
]);

const TOKEN_PARAM_KEYS = new Set(['token', 'publictoken', 'public_token']);

const LARGE_TEXT_KEYS = new Set([
  'contratotexto',
  'contrato_texto',
  'elementos',
  'texto',
  'html',
  'content',
  'body',
  'pdf',
]);

const MAX_STRING_LEN = 200;
const MAX_DETAIL_BYTES = 8_000;

export interface PgErrorInfo {
  code?: string;
  constraint?: string;
  column?: string;
  detail?: string;
  message?: string;
}

function maskToken(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return '***';
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-6)}`;
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.has(lower) || lower.includes('password') || lower.includes('secret');
}

function isTokenParamKey(key: string): boolean {
  return TOKEN_PARAM_KEYS.has(key.toLowerCase());
}

function truncateString(value: string, max = MAX_STRING_LEN): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

function byteLength(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8');
  } catch {
    return 0;
  }
}

function maskSensitiveValue(key: string, value: unknown): unknown {
  if (typeof value === 'string') {
    if (isTokenParamKey(key)) return maskToken(value);
    if (isSensitiveKey(key)) return '***';
    const lower = key.toLowerCase();
    if (LARGE_TEXT_KEYS.has(lower)) {
      return { bytes: Buffer.byteLength(value, 'utf8') };
    }
    return truncateString(value);
  }
  return value;
}

export function summarizeRequestParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    out[key] = maskSensitiveValue(key, value);
  }
  return out;
}

export function summarizeRequestQuery(query: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      out[key] = value.map((v) =>
        typeof v === 'string' ? maskSensitiveValue(key, v) : v,
      );
    } else {
      out[key] = maskSensitiveValue(key, value);
    }
  }
  return out;
}

function summarizeObjectBody(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { payloadBytes: byteLength(body) };

  for (const [key, value] of Object.entries(body)) {
    if (value == null) continue;
    const lower = key.toLowerCase();

    if (isSensitiveKey(key)) {
      out[key] = '***';
      continue;
    }

    if (lower === 'elementos' && Array.isArray(value)) {
      out.elementosCount = value.length;
      out.elementosBytes = byteLength(value);
      continue;
    }

    if (lower === 'servicos' && Array.isArray(value)) {
      out.servicosCount = value.length;
      continue;
    }

    if (LARGE_TEXT_KEYS.has(lower) && typeof value === 'string') {
      out[`${key}Bytes`] = Buffer.byteLength(value, 'utf8');
      continue;
    }

    if (typeof value === 'string') {
      out[key] = truncateString(value);
      continue;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      out[`${key}Count`] = value.length;
      out[`${key}Bytes`] = byteLength(value);
      continue;
    }

    if (typeof value === 'object') {
      out[`${key}Bytes`] = byteLength(value);
    }
  }

  return out;
}

export function summarizeRequestBody(body: unknown): Record<string, unknown> | null {
  if (body == null) return null;
  if (typeof body !== 'object' || Array.isArray(body)) {
    return { type: typeof body, bytes: byteLength(body) };
  }
  return summarizeObjectBody(body as Record<string, unknown>);
}

function isPgErrorLike(value: unknown): value is PgErrorInfo {
  if (!value || typeof value !== 'object') return false;
  const pg = value as PgErrorInfo;
  return Boolean(pg.code || pg.constraint || pg.column || pg.detail);
}

function extractPgErrorFromChain(err: unknown, depth = 0): PgErrorInfo | null {
  if (!err || depth > 5) return null;
  if (isPgErrorLike(err)) {
    return {
      code: err.code,
      constraint: err.constraint,
      column: err.column,
      detail: err.detail ? truncateString(err.detail, 500) : undefined,
      message: err.message ? truncateString(err.message, 500) : undefined,
    };
  }
  if (err instanceof Error && err.cause) {
    return extractPgErrorFromChain(err.cause, depth + 1);
  }
  if (typeof err === 'object' && 'cause' in err) {
    return extractPgErrorFromChain((err as { cause?: unknown }).cause, depth + 1);
  }
  return null;
}

export function extractPgError(err: unknown): PgErrorInfo | null {
  return extractPgErrorFromChain(err);
}

export function buildRequestContext(
  params: Record<string, unknown>,
  query: Record<string, unknown>,
  body: unknown,
): Record<string, unknown> {
  const request: Record<string, unknown> = {};
  const summarizedParams = summarizeRequestParams(params);
  const summarizedQuery = summarizeRequestQuery(query);
  const summarizedBody = summarizeRequestBody(body);

  if (Object.keys(summarizedParams).length > 0) request.params = summarizedParams;
  if (Object.keys(summarizedQuery).length > 0) request.query = summarizedQuery;
  if (summarizedBody && Object.keys(summarizedBody).length > 0) request.body = summarizedBody;

  return request;
}

/** Trunca o JSON de error_detail para caber no limite do banco. */
export function capErrorDetailSize(detail: Record<string, unknown>): Record<string, unknown> {
  let serialized = JSON.stringify(detail);
  if (Buffer.byteLength(serialized, 'utf8') <= MAX_DETAIL_BYTES) return detail;

  const capped = { ...detail };
  if (capped.cause && typeof capped.cause === 'object') {
    const cause = { ...(capped.cause as Record<string, unknown>) };
    if (typeof cause.stack === 'string') {
      cause.stack = cause.stack.slice(0, 800);
    }
    capped.cause = cause;
  }
  serialized = JSON.stringify(capped);
  if (Buffer.byteLength(serialized, 'utf8') <= MAX_DETAIL_BYTES) return capped;

  if (capped.cause && typeof capped.cause === 'object') {
    const cause = { ...(capped.cause as Record<string, unknown>) };
    delete cause.stack;
    capped.cause = cause;
  }
  return capped;
}

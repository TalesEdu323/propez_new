import type { Pool } from 'pg';

export type RequestFlowMode = 'native' | 'external';

export interface RequestFlowConfig {
  mode: RequestFlowMode;
  externalUrl: string | null;
}

export type RequestType = 'whitelabel' | 'enterprise';

const SETTING_KEYS: Record<RequestType, string> = {
  whitelabel: 'request.whitelabel',
  enterprise: 'request.enterprise',
};

const DEFAULTS: Record<RequestType, RequestFlowConfig> = {
  whitelabel: { mode: 'native', externalUrl: null },
  enterprise: { mode: 'external', externalUrl: null },
};

function parseFlowConfig(raw: unknown): RequestFlowConfig {
  if (!raw || typeof raw !== 'object') return { mode: 'native', externalUrl: null };
  const o = raw as Record<string, unknown>;
  const mode = o.mode === 'external' ? 'external' : 'native';
  const externalUrl =
    typeof o.externalUrl === 'string' && o.externalUrl.trim() ? o.externalUrl.trim() : null;
  return { mode, externalUrl };
}

export async function getRequestFlowConfig(
  pool: Pool,
  type: RequestType,
): Promise<RequestFlowConfig> {
  const { rows } = await pool.query<{ value: unknown }>(
    `SELECT value FROM platform_settings WHERE key = $1`,
    [SETTING_KEYS[type]],
  );
  if (!rows[0]) return DEFAULTS[type];
  return parseFlowConfig(rows[0].value);
}

export async function getAllRequestFlowConfigs(pool: Pool): Promise<Record<RequestType, RequestFlowConfig>> {
  const { rows } = await pool.query<{ key: string; value: unknown }>(
    `SELECT key, value FROM platform_settings WHERE key = ANY($1::text[])`,
    [Object.values(SETTING_KEYS)],
  );
  const map = new Map(rows.map((r) => [r.key, parseFlowConfig(r.value)]));
  return {
    whitelabel: map.get(SETTING_KEYS.whitelabel) ?? DEFAULTS.whitelabel,
    enterprise: map.get(SETTING_KEYS.enterprise) ?? DEFAULTS.enterprise,
  };
}

export async function setRequestFlowConfig(
  pool: Pool,
  type: RequestType,
  config: RequestFlowConfig,
): Promise<void> {
  await pool.query(
    `INSERT INTO platform_settings (key, value) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [SETTING_KEYS[type], JSON.stringify(config)],
  );
}

export function isAllowedIframeUrl(url: string, allowedOrigins: string[]): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (allowedOrigins.length === 0) return true;
    const host = parsed.hostname.toLowerCase();
    return allowedOrigins.some((pattern) => {
      const p = pattern.trim().toLowerCase();
      if (!p) return false;
      if (p.startsWith('*.')) {
        const suffix = p.slice(1);
        return host === p.slice(2) || host.endsWith(suffix);
      }
      return host === p;
    });
  } catch {
    return false;
  }
}

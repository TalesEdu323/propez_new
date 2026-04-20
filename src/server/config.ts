/**
 * Configuração server-side das integrações.
 * Todas as chaves ficam apenas no processo Node — nunca no bundle do cliente.
 */

export interface IntegrationsConfig {
  appUrl: string
  prosync: {
    baseUrl: string
    apiKey: string | null
    webhookSecret: string | null
  }
  rubrica: {
    baseUrl: string
    apiKey: string | null
    webhookSecret: string | null
  }
}

function trimEnv(name: string): string | null {
  const v = process.env[name]
  if (!v) return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

export function loadIntegrationsConfig(appUrl: string): IntegrationsConfig {
  return {
    appUrl,
    prosync: {
      baseUrl: trimEnv('PROSYNC_API_URL') || 'https://app.prosync.com.br',
      apiKey: trimEnv('PROSYNC_API_KEY'),
      webhookSecret: trimEnv('PROSYNC_WEBHOOK_SECRET'),
    },
    rubrica: {
      baseUrl: trimEnv('RUBRICA_API_URL') || 'https://app.rubrica.com.br',
      apiKey: trimEnv('RUBRICA_API_KEY'),
      webhookSecret: trimEnv('RUBRICA_WEBHOOK_SECRET'),
    },
  }
}

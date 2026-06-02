/**
 * Configuração server-side das integrações.
 * Todas as chaves ficam apenas no processo Node — nunca no bundle do cliente.
 */

export interface IntegrationsConfig {
  appUrl: string
  /**
   * Segredo compartilhado da suíte Taggo (Propez/ProSync) usado em
   * HMAC para descoberta cross-app e provisionamento de service tokens.
   */
  suiteSecret: string | null
  prosync: {
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
    suiteSecret: trimEnv('TAGGO_SUITE_SECRET'),
    prosync: {
      baseUrl: trimEnv('PROSYNC_API_URL') || 'https://prosync.tech',
      apiKey: trimEnv('PROSYNC_API_KEY'),
      webhookSecret: trimEnv('PROSYNC_WEBHOOK_SECRET'),
    },
  }
}

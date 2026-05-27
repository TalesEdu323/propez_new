import type { Response } from 'express'
import type { EnvironmentConfig } from '../env.js'
import { isMailConfigured } from '../env.js'

export type AuthMailResult =
  | { ok: true }
  | { ok: false; reason: 'email_not_configured' | 'send_failed' }

export function isAuthMailFailure(
  result: AuthMailResult,
): result is Extract<AuthMailResult, { ok: false }> {
  return result.ok === false
}

export async function sendAuthEmail(
  config: EnvironmentConfig,
  tag: string,
  sendFn: () => Promise<void>,
  devHint?: string,
): Promise<AuthMailResult> {
  if (!isMailConfigured(config.mail)) {
    if (config.nodeEnv !== 'production' && devHint) {
      console.warn(`[auth/${tag}] provider=none — ${devHint}`)
    }
    return { ok: false, reason: 'email_not_configured' }
  }
  try {
    await sendFn()
    return { ok: true }
  } catch (err) {
    console.error(`[auth/${tag}] email falhou:`, err)
    return { ok: false, reason: 'send_failed' }
  }
}

export function respondAuthMailFailure(
  res: Response,
  config: EnvironmentConfig,
  result: AuthMailResult,
): Response {
  if (!isAuthMailFailure(result)) {
    return res.json({ sent: true })
  }
  if (result.reason === 'email_not_configured' && config.mail.required) {
    return res.status(503).json({
      sent: false,
      reason: 'email_not_configured',
      error: 'Serviço de e-mail não configurado. Contacte o suporte.',
    })
  }
  if (result.reason === 'send_failed') {
    return res.status(502).json({
      sent: false,
      reason: 'send_failed',
      error: 'Não foi possível enviar o e-mail. Tente novamente em instantes.',
    })
  }
  return res.status(503).json({
    sent: false,
    reason: result.reason,
    error: 'Serviço de e-mail indisponível.',
  })
}

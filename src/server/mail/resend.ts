import { Resend } from 'resend'
import type { MailConfig } from '../env.js'

export interface MailClient {
  sendVerificationEmail(input: { to: string; name: string; code: string }): Promise<void>
  sendPasswordResetEmail(input: { to: string; name: string; resetUrl: string }): Promise<void>
}

function renderVerificationHtml(name: string, code: string): string {
  const safeName = escapeHtml(name || 'utilizador')
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#fafafa; padding:32px;">
    <div style="max-width:520px; margin:0 auto; background:#fff; border-radius:16px; padding:32px; border:1px solid #eee;">
      <h1 style="font-size:20px; margin:0 0 16px;">Confirme o seu email</h1>
      <p style="color:#555; font-size:14px;">Olá ${safeName}, use o código abaixo para ativar a sua conta Propez. O código expira em 15 minutos.</p>
      <div style="margin:24px 0; padding:20px; background:#f4f4f5; border-radius:12px; text-align:center; letter-spacing:8px; font-size:28px; font-weight:700;">
        ${escapeHtml(code)}
      </div>
      <p style="color:#888; font-size:12px;">Se não foi você, ignore este email.</p>
    </div>
  </body>
</html>`
}

function renderResetHtml(name: string, resetUrl: string): string {
  const safeName = escapeHtml(name || 'utilizador')
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#fafafa; padding:32px;">
    <div style="max-width:520px; margin:0 auto; background:#fff; border-radius:16px; padding:32px; border:1px solid #eee;">
      <h1 style="font-size:20px; margin:0 0 16px;">Redefinir senha</h1>
      <p style="color:#555; font-size:14px;">Olá ${safeName}, recebemos um pedido para redefinir a sua senha. O link expira em 30 minutos.</p>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(resetUrl)}" style="display:inline-block; padding:14px 24px; background:#0f172a; color:#fff; text-decoration:none; border-radius:10px; font-weight:600;">Redefinir senha</a>
      </p>
      <p style="color:#888; font-size:12px;">Se não foi você, ignore este email.</p>
    </div>
  </body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function createMailClient(config: MailConfig): MailClient {
  const apiKey = config.resendApiKey
  const resend = apiKey ? new Resend(apiKey) : null

  async function dispatch(
    subject: string,
    to: string,
    html: string,
    tag: string,
  ): Promise<void> {
    if (!resend) {
      console.warn(`[mail] provider não configurado; simulando ${tag} para ${to}`)
      console.warn(`[mail] subject: ${subject}`)
      console.warn(`[mail] html:\n${html}`)
      return
    }
    const res = await resend.emails.send({
      from: config.from,
      to,
      subject,
      html,
    })
    if (res.error) {
      throw new Error(`[mail:${tag}] resend error: ${res.error.message}`)
    }
  }

  return {
    async sendVerificationEmail({ to, name, code }) {
      await dispatch(
        'Ative a sua conta Propez',
        to,
        renderVerificationHtml(name, code),
        'verification',
      )
    },
    async sendPasswordResetEmail({ to, name, resetUrl }) {
      await dispatch(
        'Redefinir a sua senha Propez',
        to,
        renderResetHtml(name, resetUrl),
        'reset',
      )
    },
  }
}

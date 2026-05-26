import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { Resend } from 'resend'
import type { MailConfig } from '../env.js'
import { renderResetHtml, renderVerificationHtml } from './templates.js'

export interface MailClient {
  sendVerificationEmail(input: { to: string; name: string; code: string }): Promise<void>
  sendPasswordResetEmail(input: { to: string; name: string; resetUrl: string }): Promise<void>
}

function createSmtpTransporter(config: MailConfig): Transporter | null {
  const smtp = config.smtp
  if (!smtp) return null

  const auth =
    smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined

  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth,
    connectionTimeout: smtp.connectionTimeout,
    greetingTimeout: smtp.greetingTimeout,
  })
}

export function createMailClient(config: MailConfig): MailClient {
  const smtpTransporter =
    config.provider === 'smtp' ? createSmtpTransporter(config) : null
  const resend =
    config.provider === 'resend' && config.resendApiKey
      ? new Resend(config.resendApiKey)
      : null

  async function dispatch(
    subject: string,
    to: string,
    html: string,
    tag: string,
  ): Promise<void> {
    if (config.provider === 'smtp') {
      if (!smtpTransporter) {
        throw new Error(
          `[mail:${tag}] MAIL_PROVIDER=smtp mas SMTP_HOST/usuário/senha não estão configurados`,
        )
      }
      await smtpTransporter.sendMail({ from: config.from, to, subject, html })
      return
    }

    if (config.provider === 'resend') {
      if (!resend) {
        throw new Error(`[mail:${tag}] MAIL_PROVIDER=resend mas RESEND_API_KEY é inválida ou ausente`)
      }
      const res = await resend.emails.send({ from: config.from, to, subject, html })
      if (res.error) {
        throw new Error(`[mail:${tag}] resend error: ${res.error.message}`)
      }
      return
    }

    console.warn(`[mail] provider=none; simulando ${tag} para ${to}`)
    console.warn(`[mail] subject: ${subject}`)
    console.warn(`[mail] html:\n${html}`)
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

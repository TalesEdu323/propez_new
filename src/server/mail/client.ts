import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { Resend } from 'resend'
import type { MailConfig } from '../env.js'
import type { EmailBranding } from './layout.js'
import { renderResetHtml, renderVerificationHtml } from './templates/auth.js'

export interface MailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

export interface MailClient {
  sendVerificationEmail(input: { to: string; name: string; code: string }): Promise<void>
  sendPasswordResetEmail(input: { to: string; name: string; resetUrl: string }): Promise<void>
  sendBusinessEmail(input: {
    to: string
    subject: string
    html: string
    tag: string
    attachment?: MailAttachment
  }): Promise<void>
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

export function createMailClient(config: MailConfig, branding: EmailBranding): MailClient {
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
    attachment?: MailAttachment,
  ): Promise<void> {
    if (config.provider === 'smtp') {
      if (!smtpTransporter) {
        throw new Error(
          `[mail:${tag}] MAIL_PROVIDER=smtp mas SMTP_HOST/usuário/senha não estão configurados`,
        )
      }
      const envelopeFrom = config.smtp?.user?.trim() || config.from
      await smtpTransporter.sendMail({
        from: config.from,
        to,
        subject,
        html,
        envelope: { from: envelopeFrom, to: [to] },
        attachments: attachment
          ? [{ filename: attachment.filename, content: attachment.content, contentType: attachment.contentType ?? 'application/pdf' }]
          : undefined,
      })
      return
    }

    if (config.provider === 'resend') {
      if (!resend) {
        throw new Error(`[mail:${tag}] MAIL_PROVIDER=resend mas RESEND_API_KEY é inválida ou ausente`)
      }
      const res = await resend.emails.send({
        from: config.from,
        to,
        subject,
        html,
        attachments: attachment
          ? [{ filename: attachment.filename, content: attachment.content.toString('base64'), contentType: attachment.contentType ?? 'application/pdf' }]
          : undefined,
      })
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
        'Ative a sua conta PropEZ',
        to,
        renderVerificationHtml(branding, name, code),
        'verification',
      )
    },
    async sendPasswordResetEmail({ to, name, resetUrl }) {
      await dispatch(
        'Redefinir a sua senha PropEZ',
        to,
        renderResetHtml(branding, name, resetUrl),
        'reset',
      )
    },
    async sendBusinessEmail({ to, subject, html, tag, attachment }) {
      await dispatch(subject, to, html, tag, attachment)
    },
  }
}

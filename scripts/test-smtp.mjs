/**
 * Testa conexão SMTP (dotenv). Uso: node scripts/test-smtp.mjs [email-destino]
 */
import 'dotenv/config'
import nodemailer from 'nodemailer'

const host = process.env.SMTP_HOST || process.env.EMAIL_HOST
const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465)
const secure = String(process.env.SMTP_SECURE ?? process.env.EMAIL_SECURE ?? port === 465)
  .toLowerCase()
  .match(/^(1|true|yes)$/) !== null
const user = process.env.SMTP_USER || process.env.EMAIL_USER
const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS
const from = process.env.MAIL_FROM || user
const to = process.argv[2]

if (!host || !user || !pass) {
  console.error('[test-smtp] Defina EMAIL_HOST, EMAIL_USER e EMAIL_PASS no .env')
  process.exit(1)
}

const transport = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  connectionTimeout: Number(process.env.EMAIL_TIMEOUT || 30000),
  greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 8000),
})

console.log(`[test-smtp] ${host}:${port} secure=${secure} user=${user}`)

try {
  await transport.verify()
  console.log('[test-smtp] conexão OK')
} catch (err) {
  console.error('[test-smtp] verify falhou:', err.message)
  process.exit(1)
}

if (!to) {
  console.log('[test-smtp] Passe um email destino para enviar teste: node scripts/test-smtp.mjs voce@email.com')
  process.exit(0)
}

const smtpUser = user?.trim()
const info = await transport.sendMail({
  from,
  to,
  replyTo: smtpUser,
  subject: 'PropEZ — teste SMTP',
  text: 'Se recebeu isto, o SMTP Hostinger está configurado.',
  html: '<p>Se recebeu isto, o SMTP Hostinger está configurado.</p>',
  envelope: smtpUser ? { from: smtpUser, to: [to] } : undefined,
})
console.log('[test-smtp] enviado:', info.messageId)

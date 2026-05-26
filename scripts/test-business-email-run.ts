import 'dotenv/config'
import nodemailer from 'nodemailer'
import {
  BUSINESS_EMAIL_RENDERERS,
  BUSINESS_EMAIL_SUBJECTS,
} from '../src/server/mail/templates/business/index.js'
import type { ProposalNotificationContext } from '../src/server/services/proposalNotificationContext.js'

const to = process.argv[2]
const templateType = (process.argv[3] || 'proposal_approved') as keyof typeof BUSINESS_EMAIL_RENDERERS

if (!to) {
  console.error('Uso: npx tsx scripts/test-business-email-run.ts <email> [templateType]')
  process.exit(1)
}

const host = process.env.SMTP_HOST || process.env.EMAIL_HOST
const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465)
const secure = String(process.env.SMTP_SECURE ?? process.env.EMAIL_SECURE ?? port === 465)
  .toLowerCase()
  .match(/^(1|true|yes)$/) !== null
const user = process.env.SMTP_USER || process.env.EMAIL_USER
const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS
const from = process.env.MAIL_FROM || 'PropEZ <noreply@example.com>'
const appUrl = (process.env.APP_URL || 'http://localhost:3001').replace(/\/+$/, '')

if (!host || !user || !pass) {
  console.error('[test-business-email] Configure SMTP no .env')
  process.exit(1)
}

const renderers = BUSINESS_EMAIL_RENDERERS[templateType]
if (!renderers) {
  console.error(`Template desconhecido: ${templateType}`)
  console.error('Opções:', Object.keys(BUSINESS_EMAIL_RENDERERS).join(', '))
  process.exit(1)
}

const mockCtx: ProposalNotificationContext = {
  proposalId: '00000000-0000-4000-8000-000000000001',
  organizationId: '00000000-0000-4000-8000-000000000002',
  orgName: 'Taggo Demo',
  orgCnpj: '00.000.000/0001-00',
  clienteNome: 'Cliente Teste',
  clienteEmail: to,
  clienteEmailFromCliente: null,
  status: 'aprovada',
  valorCents: 150000,
  descontoCents: 0,
  valorLiquidoCents: 150000,
  publicToken: 'demo-token-123',
  rubricaStatus: 'sent',
  rubricaSigningUrl: `${appUrl}/p/demo-token-123`,
  rubricaSignedPdfUrl: `${appUrl}/api/integrations/rubrica/download/demo`,
  contratoTitulo: 'Contrato de Prestação de Serviços',
  dataValidade: new Date(Date.now() + 7 * 86400000).toISOString(),
  pago: false,
  internalUrl: `${appUrl}/?route=visualizar-proposta&id=00000000-0000-4000-8000-000000000001`,
  publicUrl: `${appUrl}/p/demo-token-123`,
}

const html = renderers.org(appUrl, mockCtx)
const subject = `${BUSINESS_EMAIL_SUBJECTS[templateType].org} — ${mockCtx.clienteNome} [teste]`

const transport = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  connectionTimeout: Number(process.env.EMAIL_TIMEOUT || 30000),
  greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 8000),
})

await transport.verify()
const info = await transport.sendMail({ from, to, subject, html })
console.log('[test-business-email] enviado:', info.messageId)

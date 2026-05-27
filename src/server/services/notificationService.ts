import type { Pool } from 'pg'
import type { MailClient } from '../mail/client.js'
import type { EnvironmentConfig } from '../env.js'
import { normalizeEmailBranding } from '../mail/layout.js'
import {
  BUSINESS_EMAIL_RENDERERS,
  BUSINESS_EMAIL_SUBJECTS,
} from '../mail/templates/business/index.js'
import {
  loadProposalNotificationContext,
  resolveClientEmail,
  type ProposalNotificationType,
} from './proposalNotificationContext.js'

const IN_APP_COPY: Record<
  ProposalNotificationType,
  { title: string; message: (ctx: { clienteNome: string; orgName: string }) => string; actionLabel: string }
> = {
  proposal_created: {
    title: 'Nova proposta criada',
    message: (c) => `Proposta para ${c.clienteNome} foi criada.`,
    actionLabel: 'Ver proposta',
  },
  proposal_viewed: {
    title: 'Proposta visualizada',
    message: (c) => `${c.clienteNome} abriu o link público da proposta.`,
    actionLabel: 'Ver proposta',
  },
  proposal_approved: {
    title: 'Proposta aprovada',
    message: (c) => `${c.clienteNome} aprovou a proposta.`,
    actionLabel: 'Ver proposta',
  },
  proposal_rejected: {
    title: 'Proposta recusada',
    message: (c) => `${c.clienteNome} recusou a proposta.`,
    actionLabel: 'Ver proposta',
  },
  contract_sent: {
    title: 'Contrato enviado',
    message: (c) => `Contrato enviado para assinatura — ${c.clienteNome}.`,
    actionLabel: 'Ver proposta',
  },
  contract_signed: {
    title: 'Contrato assinado',
    message: (c) => `Contrato de ${c.clienteNome} foi assinado.`,
    actionLabel: 'Ver proposta',
  },
  proposal_paid: {
    title: 'Pagamento recebido',
    message: (c) => `Pagamento registrado na proposta de ${c.clienteNome}.`,
    actionLabel: 'Ver proposta',
  },
}

async function listOrgMemberEmails(
  pool: Pool,
  organizationId: string,
): Promise<Array<{ userId: string; email: string; name: string }>> {
  const { rows } = await pool.query<{ user_id: string; email: string; name: string }>(
    `SELECT u.id AS user_id, u.email, u.name
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.organization_id = $1`,
    [organizationId],
  )
  return rows.map((r) => ({
    userId: r.user_id,
    email: r.email.trim().toLowerCase(),
    name: r.name,
  }))
}

async function insertInAppNotifications(
  pool: Pool,
  input: {
    organizationId: string
    userIds: string[]
    type: ProposalNotificationType
    title: string
    message: string
    actionUrl: string
    actionLabel: string
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  if (!input.userIds.length) return
  const metadata = JSON.stringify(input.metadata ?? {})
  for (const userId of input.userIds) {
    await pool.query(
      `INSERT INTO notifications (organization_id, user_id, type, title, message, action_url, action_label, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        input.organizationId,
        userId,
        input.type,
        input.title,
        input.message,
        input.actionUrl,
        input.actionLabel,
        metadata,
      ],
    )
  }
}

async function hasProposalNotification(
  pool: Pool,
  organizationId: string,
  proposalId: string,
  type: ProposalNotificationType,
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM notifications
     WHERE organization_id = $1 AND type = $2
       AND metadata->>'proposalId' = $3
     LIMIT 1`,
    [organizationId, type, proposalId],
  )
  return rows.length > 0
}

function sendEmailsFireAndForget(
  mail: MailClient,
  emails: Array<{ to: string; subject: string; html: string; tag: string }>,
): void {
  for (const e of emails) {
    void mail.sendBusinessEmail(e).catch((err) => {
      console.error(`[notifications] email ${e.tag} → ${e.to} falhou:`, err)
    })
  }
}

export async function notifyProposalEvent(deps: {
  pool: Pool
  mail: MailClient
  config: EnvironmentConfig
  proposalId: string
  type: ProposalNotificationType
  metadata?: Record<string, unknown>
}): Promise<void> {
  const { pool, mail, config, proposalId, type, metadata } = deps
  const ctx = await loadProposalNotificationContext(pool, proposalId, config.appUrl)
  if (!ctx) {
    console.warn('[notifications] proposta não encontrada:', proposalId)
    return
  }

  if (type === 'contract_signed') {
    const already = await hasProposalNotification(pool, ctx.organizationId, proposalId, type)
    if (already) {
      console.info('[notifications] contract_signed já notificado, ignorando duplicata:', proposalId)
      return
    }
  }

  const copy = IN_APP_COPY[type]
  const members = await listOrgMemberEmails(pool, ctx.organizationId)
  const memberIds = members.map((m) => m.userId)

  await insertInAppNotifications(pool, {
    organizationId: ctx.organizationId,
    userIds: memberIds,
    type,
    title: copy.title,
    message: copy.message({ clienteNome: ctx.clienteNome, orgName: ctx.orgName }),
    actionUrl: ctx.internalUrl,
    actionLabel: copy.actionLabel,
    metadata: { proposalId: ctx.proposalId, ...metadata },
  })

  const emailJobs: Array<{ to: string; subject: string; html: string; tag: string }> = []

  const businessKey = type as keyof typeof BUSINESS_EMAIL_RENDERERS
  if (businessKey in BUSINESS_EMAIL_RENDERERS) {
    const branding = normalizeEmailBranding(config.appUrl, config.taggoSiteUrl)
    const renderers = BUSINESS_EMAIL_RENDERERS[businessKey]
    const subjects = BUSINESS_EMAIL_SUBJECTS[businessKey]
    const orgHtml = renderers.org(branding, ctx)
    const seen = new Set<string>()
    for (const m of members) {
      if (!m.email || seen.has(m.email)) continue
      seen.add(m.email)
      emailJobs.push({
        to: m.email,
        subject: `${subjects.org} — ${ctx.clienteNome}`,
        html: orgHtml,
        tag: `${type}:org`,
      })
    }
    const clientEmail = resolveClientEmail(ctx)
    if (clientEmail && renderers.client && !seen.has(clientEmail.toLowerCase())) {
      const clientSubject = subjects.client ?? subjects.org
      emailJobs.push({
        to: clientEmail,
        subject: `${clientSubject} — ${ctx.orgName}`,
        html: renderers.client!(branding, ctx),
        tag: `${type}:client`,
      })
    }
  }

  sendEmailsFireAndForget(mail, emailJobs)
}

/** Dispara notificação sem bloquear a requisição. */
export function notifyProposalEventAsync(deps: Parameters<typeof notifyProposalEvent>[0]): void {
  void notifyProposalEvent(deps).catch((err) => {
    console.error('[notifications] notifyProposalEvent falhou:', err)
  })
}

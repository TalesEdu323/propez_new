import type { ProposalNotificationContext } from '../../../services/proposalNotificationContext.js'
import type { EmailBranding } from '../../layout.js'
import { renderLead } from '../../layout.js'
import {
  baseSummaryRows,
  clientPublicCta,
  orgCtas,
  renderHeading,
  renderParagraph,
  renderSummaryTable,
  statusBadge,
  wrapBusinessEmail,
  renderRubricaSignatureNotice,
} from './shared.js'
import { renderCtaButton, renderSecondaryLink } from '../../layout.js'

export function renderProposalCreatedOrg(branding: EmailBranding, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    branding,
    `Nova proposta — ${ctx.clienteNome}`,
    'Nova proposta criada',
    [
      renderHeading('Nova proposta criada'),
      statusBadge('Pendente', 'warning'),
      renderParagraph(
        `Uma nova proposta para <strong>${ctx.clienteNome}</strong> foi criada em <strong>${ctx.orgName}</strong>.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      orgCtas(ctx),
    ],
  )
}

export function renderProposalSentClient(branding: EmailBranding, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    branding,
    `Sua proposta — ${ctx.orgName}`,
    'Proposta disponível para visualização',
    [
      renderHeading('Sua proposta está pronta'),
      renderLead(
        `Olá <strong>${ctx.clienteNome}</strong>, <strong>${ctx.orgName}</strong> preparou uma proposta comercial para você via PropEZ.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      clientPublicCta(ctx),
      renderParagraph(
        '<span style="font-size:12px;color:#a1a1aa;">Este link é exclusivo para você. Não compartilhe com terceiros.</span>',
      ),
    ],
  )
}

export function renderProposalApprovedOrg(branding: EmailBranding, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    branding,
    `Proposta aprovada — ${ctx.clienteNome}`,
    'Proposta aprovada',
    [
      renderHeading('Proposta aprovada'),
      statusBadge('Aprovada', 'success'),
      renderParagraph(
        `A proposta para <strong>${ctx.clienteNome}</strong> foi aprovada pelo cliente.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      orgCtas(ctx),
    ],
  )
}

export function renderProposalApprovedClient(branding: EmailBranding, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    branding,
    `Confirmação — proposta aprovada`,
    'Sua proposta foi aprovada',
    [
      renderHeading('Obrigado pela aprovação'),
      renderParagraph(
        `Olá <strong>${ctx.clienteNome}</strong>, confirmamos o recebimento da sua aprovação da proposta de <strong>${ctx.orgName}</strong>.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      clientPublicCta(ctx),
      renderParagraph(
        '<span style="font-size:12px;color:#a1a1aa;">Em breve entraremos em contato sobre os próximos passos.</span>',
      ),
    ],
  )
}

export function renderProposalRejectedOrg(branding: EmailBranding, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    branding,
    `Proposta recusada — ${ctx.clienteNome}`,
    'Proposta recusada',
    [
      renderHeading('Proposta recusada'),
      statusBadge('Recusada', 'danger'),
      renderParagraph(`A proposta para <strong>${ctx.clienteNome}</strong> foi recusada.`),
      renderSummaryTable(baseSummaryRows(ctx)),
      orgCtas(ctx),
    ],
  )
}

export function renderProposalRejectedClient(branding: EmailBranding, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    branding,
    `Atualização da sua proposta`,
    'Proposta recusada',
    [
      renderHeading('Proposta encerrada'),
      renderParagraph(
        `Olá <strong>${ctx.clienteNome}</strong>, registramos sua decisão sobre a proposta de <strong>${ctx.orgName}</strong>.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      renderParagraph(
        'Se tiver dúvidas, responda diretamente à equipe que enviou a proposta.',
      ),
    ],
  )
}

export function renderContractSentOrg(branding: EmailBranding, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    branding,
    `Contrato enviado — ${ctx.clienteNome}`,
    'Contrato enviado para assinatura',
    [
      renderHeading('Contrato enviado'),
      statusBadge('Aguardando assinatura', 'warning'),
      renderParagraph(
        `O contrato da proposta de <strong>${ctx.clienteNome}</strong> foi enviado para assinatura digital.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      orgCtas(ctx),
      renderRubricaSignatureNotice('invite'),
    ],
  )
}

export function renderContractSentClient(branding: EmailBranding, ctx: ProposalNotificationContext): string {
  const signCta = ctx.rubricaSigningUrl
    ? renderCtaButton('Assinar contrato agora', ctx.rubricaSigningUrl)
    : clientPublicCta(ctx)
  return wrapBusinessEmail(
    branding,
    `Assine seu contrato — ${ctx.orgName}`,
    'Contrato aguardando assinatura',
    [
      renderHeading('Seu contrato está pronto'),
      renderParagraph(
        `Olá <strong>${ctx.clienteNome}</strong>, <strong>${ctx.orgName}</strong> enviou um contrato para sua assinatura.`,
      ),
      renderRubricaSignatureNotice('invite'),
      renderSummaryTable(baseSummaryRows(ctx)),
      signCta,
      renderParagraph(
        '<span style="font-size:12px;color:#a1a1aa;">O PDF em anexo contém o contrato com a assinatura da empresa. O link é exclusivo para você.</span>',
      ),
    ],
  )
}

export function renderContractSignedOrg(branding: EmailBranding, ctx: ProposalNotificationContext): string {
  const download =
    ctx.rubricaSignedPdfUrl
      ? renderCtaButton('Baixar contrato assinado', ctx.rubricaSignedPdfUrl)
      : ''
  return wrapBusinessEmail(
    branding,
    `Contrato assinado — ${ctx.clienteNome}`,
    'Contrato assinado',
    [
      renderHeading('Contrato assinado'),
      statusBadge('Assinado', 'success'),
      renderRubricaSignatureNotice('signed'),
      renderParagraph(
        `O contrato da proposta de <strong>${ctx.clienteNome}</strong> foi assinado com sucesso.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      orgCtas(ctx),
      download,
    ],
  )
}

export function renderContractSignedClient(branding: EmailBranding, ctx: ProposalNotificationContext): string {
  const download =
    ctx.rubricaSignedPdfUrl
      ? renderCtaButton('Baixar cópia assinada', ctx.rubricaSignedPdfUrl)
      : clientPublicCta(ctx)
  return wrapBusinessEmail(
    branding,
    `Seu contrato assinado — ${ctx.orgName}`,
    'Contrato assinado com sucesso',
    [
      renderHeading('Assinatura confirmada'),
      renderRubricaSignatureNotice('signed'),
      renderParagraph(
        `Olá <strong>${ctx.clienteNome}</strong>, sua assinatura do contrato com <strong>${ctx.orgName}</strong> foi registrada.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      download,
    ],
  )
}

export function renderProposalPaidOrg(branding: EmailBranding, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    branding,
    `Pagamento recebido — ${ctx.clienteNome}`,
    'Pagamento registrado',
    [
      renderHeading('Pagamento recebido'),
      statusBadge('Pago', 'success'),
      renderParagraph(
        `A proposta de <strong>${ctx.clienteNome}</strong> foi marcada como paga.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      orgCtas(ctx),
    ],
  )
}

export function renderProposalPaidClient(branding: EmailBranding, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    branding,
    `Confirmação de pagamento`,
    'Pagamento confirmado',
    [
      renderHeading('Pagamento confirmado'),
      renderParagraph(
        `Olá <strong>${ctx.clienteNome}</strong>, confirmamos o pagamento referente à proposta de <strong>${ctx.orgName}</strong>.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      clientPublicCta(ctx),
    ],
  )
}

export type BusinessEmailRenderer = (branding: EmailBranding, ctx: ProposalNotificationContext) => string

export type BusinessEmailRendererSet = {
  org: BusinessEmailRenderer
  client?: BusinessEmailRenderer
}

export const BUSINESS_EMAIL_RENDERERS: Record<
  | 'proposal_created'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'contract_sent'
  | 'contract_signed'
  | 'proposal_paid',
  BusinessEmailRendererSet
> = {
  proposal_created: {
    org: renderProposalCreatedOrg,
  },
  proposal_approved: {
    org: renderProposalApprovedOrg,
    client: renderProposalApprovedClient,
  },
  proposal_rejected: {
    org: renderProposalRejectedOrg,
    client: renderProposalRejectedClient,
  },
  contract_sent: {
    org: renderContractSentOrg,
    client: renderContractSentClient,
  },
  contract_signed: {
    org: renderContractSignedOrg,
    client: renderContractSignedClient,
  },
  proposal_paid: {
    org: renderProposalPaidOrg,
    client: renderProposalPaidClient,
  },
}

export const BUSINESS_EMAIL_SUBJECTS: Record<
  keyof typeof BUSINESS_EMAIL_RENDERERS,
  { org: string; client?: string }
> = {
  proposal_created: {
    org: 'Nova proposta criada',
  },
  proposal_approved: {
    org: 'Proposta aprovada',
    client: 'Sua proposta foi aprovada',
  },
  proposal_rejected: {
    org: 'Proposta recusada',
    client: 'Atualização da sua proposta',
  },
  contract_sent: {
    org: 'Contrato enviado para assinatura',
    client: 'Assine seu contrato',
  },
  contract_signed: {
    org: 'Contrato assinado',
    client: 'Contrato assinado com sucesso',
  },
  proposal_paid: {
    org: 'Pagamento recebido na proposta',
    client: 'Pagamento confirmado',
  },
}

export const PROPOSAL_SENT_SUBJECT = 'Sua proposta comercial'

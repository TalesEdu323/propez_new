import type { ProposalNotificationContext } from '../../../services/proposalNotificationContext.js'
import {
  baseSummaryRows,
  clientPublicCta,
  orgCtas,
  renderHeading,
  renderParagraph,
  renderSummaryTable,
  statusBadge,
  wrapBusinessEmail,
} from './shared.js'
import { renderCtaButton, renderSecondaryLink } from '../../layout.js'

export function renderProposalApprovedOrg(appUrl: string, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    appUrl,
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

export function renderProposalApprovedClient(appUrl: string, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    appUrl,
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

export function renderProposalRejectedOrg(appUrl: string, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    appUrl,
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

export function renderProposalRejectedClient(appUrl: string, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    appUrl,
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

export function renderContractSentOrg(appUrl: string, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    appUrl,
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
      ctx.rubricaSigningUrl
        ? renderSecondaryLink('Link de assinatura (Rubrica)', ctx.rubricaSigningUrl)
        : '',
    ],
  )
}

export function renderContractSentClient(appUrl: string, ctx: ProposalNotificationContext): string {
  const signCta = ctx.rubricaSigningUrl
    ? renderCtaButton('Assinar contrato agora', ctx.rubricaSigningUrl)
    : clientPublicCta(ctx)
  return wrapBusinessEmail(
    appUrl,
    `Assine seu contrato — ${ctx.orgName}`,
    'Contrato aguardando assinatura',
    [
      renderHeading('Seu contrato está pronto'),
      renderParagraph(
        `Olá <strong>${ctx.clienteNome}</strong>, <strong>${ctx.orgName}</strong> enviou um contrato para sua assinatura.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      signCta,
      renderParagraph(
        '<span style="font-size:12px;color:#a1a1aa;">O link de assinatura é exclusivo para você. Não compartilhe com terceiros.</span>',
      ),
    ],
  )
}

export function renderContractSignedOrg(appUrl: string, ctx: ProposalNotificationContext): string {
  const download =
    ctx.rubricaSignedPdfUrl
      ? renderCtaButton('Baixar contrato assinado', ctx.rubricaSignedPdfUrl)
      : ''
  return wrapBusinessEmail(
    appUrl,
    `Contrato assinado — ${ctx.clienteNome}`,
    'Contrato assinado',
    [
      renderHeading('Contrato assinado'),
      statusBadge('Assinado', 'success'),
      renderParagraph(
        `O contrato da proposta de <strong>${ctx.clienteNome}</strong> foi assinado com sucesso.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      orgCtas(ctx),
      download,
    ],
  )
}

export function renderContractSignedClient(appUrl: string, ctx: ProposalNotificationContext): string {
  const download =
    ctx.rubricaSignedPdfUrl
      ? renderCtaButton('Baixar cópia assinada', ctx.rubricaSignedPdfUrl)
      : clientPublicCta(ctx)
  return wrapBusinessEmail(
    appUrl,
    `Contrato assinado — ${ctx.orgName}`,
    'Contrato assinado com sucesso',
    [
      renderHeading('Assinatura confirmada'),
      renderParagraph(
        `Olá <strong>${ctx.clienteNome}</strong>, sua assinatura do contrato com <strong>${ctx.orgName}</strong> foi registrada.`,
      ),
      renderSummaryTable(baseSummaryRows(ctx)),
      download,
    ],
  )
}

export function renderProposalPaidOrg(appUrl: string, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    appUrl,
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

export function renderProposalPaidClient(appUrl: string, ctx: ProposalNotificationContext): string {
  return wrapBusinessEmail(
    appUrl,
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

export type BusinessEmailRenderer = (appUrl: string, ctx: ProposalNotificationContext) => string

export const BUSINESS_EMAIL_RENDERERS: Record<
  'proposal_approved' | 'proposal_rejected' | 'contract_sent' | 'contract_signed' | 'proposal_paid',
  { org: BusinessEmailRenderer; client: BusinessEmailRenderer }
> = {
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
  { org: string; client: string }
> = {
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

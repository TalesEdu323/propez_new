import {
  fmtBrl,
  fmtDatePt,
  renderCtaButton,
  renderEmailLayout,
  renderHeading,
  renderParagraph,
  renderSecondaryLink,
  renderSummaryTable,
  statusBadge,
  type SummaryRow,
} from '../../layout.js'
import type { ProposalNotificationContext } from '../../../services/proposalNotificationContext.js'

export function baseSummaryRows(ctx: ProposalNotificationContext): SummaryRow[] {
  const rows: SummaryRow[] = [
    { label: 'Cliente', value: ctx.clienteNome },
    { label: 'Organização', value: ctx.orgName },
    { label: 'Valor', value: fmtBrl(ctx.valorLiquidoCents) },
    { label: 'Status', value: statusLabel(ctx.status) },
  ]
  if (ctx.contratoTitulo) rows.push({ label: 'Contrato', value: ctx.contratoTitulo })
  if (ctx.dataValidade) rows.push({ label: 'Validade', value: fmtDatePt(ctx.dataValidade) })
  if (ctx.rubricaStatus) rows.push({ label: 'Assinatura', value: rubricaLabel(ctx.rubricaStatus) })
  return rows
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pendente: 'Pendente',
    aprovada: 'Aprovada',
    recusada: 'Recusada',
  }
  return map[status] ?? status
}

export function rubricaLabel(status: string | null): string {
  const map: Record<string, string> = {
    pending: 'Aguardando envio',
    sent: 'Aguardando assinatura',
    signed: 'Assinado',
    failed: 'Falhou',
    cancelled: 'Cancelado',
  }
  return status ? map[status] ?? status : '—'
}

export function wrapBusinessEmail(
  appUrl: string,
  preheader: string,
  title: string,
  parts: string[],
): string {
  return renderEmailLayout({
    appUrl,
    preheader,
    title,
    bodyHtml: parts.join(''),
  })
}

export function orgCtas(ctx: ProposalNotificationContext): string {
  let html = renderCtaButton('Ver proposta no PropEZ', ctx.internalUrl)
  if (ctx.publicUrl) {
    html += renderSecondaryLink('Abrir link público da proposta', ctx.publicUrl)
  }
  return html
}

export function clientPublicCta(ctx: ProposalNotificationContext): string {
  if (!ctx.publicUrl) return ''
  return renderCtaButton('Ver minha proposta', ctx.publicUrl)
}

export { renderHeading, renderParagraph, renderSummaryTable, statusBadge, fmtBrl, fmtDatePt }

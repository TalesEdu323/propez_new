export const BRAND = {
  orange: '#ff5200',
  text: '#080804',
  muted: '#71717a',
  bg: '#fafafa',
  card: '#ffffff',
  border: '#e4e4e7',
} as const

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function logoUrl(appUrl: string): string {
  return `${appUrl.replace(/\/+$/, '')}/logo.svg`
}

export interface EmailLayoutOptions {
  appUrl: string
  preheader?: string
  title: string
  bodyHtml: string
}

export function renderEmailLayout(opts: EmailLayoutOptions): string {
  const logo = escapeHtml(logoUrl(opts.appUrl))
  const preheader = opts.preheader
    ? `<span style="display:none;max-height:0;overflow:hidden;color:transparent;">${escapeHtml(opts.preheader)}</span>`
    : ''

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  ${preheader}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 0 24px;text-align:center;">
              <img src="${logo}" alt="PropEZ" width="180" height="52" style="display:inline-block;max-width:180px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;padding:32px 28px;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0;text-align:center;font-size:11px;color:${BRAND.muted};line-height:1.5;">
              PropEZ — propostas e contratos profissionais<br />
              <a href="${escapeHtml(opts.appUrl)}" style="color:${BRAND.muted};text-decoration:underline;">${escapeHtml(opts.appUrl)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function renderHeading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${BRAND.text};letter-spacing:-0.02em;">${escapeHtml(text)}</h1>`
}

export function renderParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">${text}</p>`
}

export function statusBadge(label: string, tone: 'success' | 'warning' | 'danger' | 'neutral'): string {
  const colors = {
    success: { bg: '#ecfdf5', fg: '#047857' },
    warning: { bg: '#fffbeb', fg: '#b45309' },
    danger: { bg: '#fef2f2', fg: '#b91c1c' },
    neutral: { bg: '#f4f4f5', fg: '#52525b' },
  }[tone]
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;background:${colors.bg};color:${colors.fg};">${escapeHtml(label)}</span>`
}

export interface SummaryRow {
  label: string
  value: string
}

export function renderSummaryTable(rows: SummaryRow[]): string {
  const trs = rows
    .filter((r) => r.value)
    .map(
      (r) => `<tr>
        <td style="padding:10px 0;font-size:12px;font-weight:600;color:${BRAND.muted};text-transform:uppercase;letter-spacing:0.05em;width:38%;vertical-align:top;">${escapeHtml(r.label)}</td>
        <td style="padding:10px 0;font-size:14px;color:${BRAND.text};vertical-align:top;">${escapeHtml(r.value)}</td>
      </tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};">${trs}</table>`
}

export function renderCtaButton(label: string, href: string, primary = true): string {
  const bg = primary ? BRAND.text : BRAND.card
  const fg = primary ? '#ffffff' : BRAND.text
  const border = primary ? BRAND.text : BRAND.border
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 8px;">
    <tr>
      <td style="border-radius:10px;background:${bg};border:1px solid ${border};">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:${fg};text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`
}

export function renderSecondaryLink(label: string, href: string): string {
  return `<p style="margin:8px 0 0;font-size:13px;"><a href="${escapeHtml(href)}" style="color:${BRAND.orange};font-weight:600;text-decoration:none;">${escapeHtml(label)}</a></p>`
}

export function fmtBrl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function fmtDatePt(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(d)
}

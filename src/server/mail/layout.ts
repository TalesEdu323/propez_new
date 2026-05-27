export const BRAND = {
  orange: '#ff5200',
  text: '#080804',
  muted: '#71717a',
  subtle: '#a1a1aa',
  bg: '#f4f4f5',
  card: '#ffffff',
  border: '#e4e4e7',
  taggo: '#080804',
} as const

export interface EmailBranding {
  /** URL do app PropEZ (logo, CTAs da aplicação). */
  appUrl: string
  /** Site institucional Taggo. */
  taggoSiteUrl: string
}

const DEFAULT_TAGGO_SITE = 'https://taggo.com.br'

export function normalizeEmailBranding(
  appUrl: string,
  taggoSiteUrl?: string,
): EmailBranding {
  return {
    appUrl: appUrl.replace(/\/+$/, ''),
    taggoSiteUrl: (taggoSiteUrl || DEFAULT_TAGGO_SITE).replace(/\/+$/, ''),
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function propezLogoUrl(branding: EmailBranding): string {
  return `${branding.appUrl}/logo.svg`
}

export interface EmailLayoutOptions {
  branding: EmailBranding
  preheader?: string
  title: string
  bodyHtml: string
}

export function renderEmailLayout(opts: EmailLayoutOptions): string {
  const { branding } = opts
  const logo = escapeHtml(propezLogoUrl(branding))
  const appHref = escapeHtml(branding.appUrl)
  const taggoHref = escapeHtml(branding.taggoSiteUrl)
  const taggoHost = escapeHtml(branding.taggoSiteUrl.replace(/^https?:\/\//, ''))

  const preheader = opts.preheader
    ? `<span style="display:none;max-height:0;overflow:hidden;color:transparent;mso-hide:all;">${escapeHtml(opts.preheader)}&#847;&zwnj;&nbsp;</span>`
    : ''

  return `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(opts.title)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheader}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
          <!-- Barra Taggo -->
          <tr>
            <td style="padding:0 0 20px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="height:4px;width:48px;background:${BRAND.orange};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.muted};">
                <a href="${taggoHref}" style="color:${BRAND.text};text-decoration:none;">Taggo</a>
                <span style="color:${BRAND.subtle};"> · </span>
                <span style="color:${BRAND.muted};">tecnologia para negócios</span>
              </p>
            </td>
          </tr>
          <!-- Cabeçalho PropEZ -->
          <tr>
            <td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px 16px 0 0;padding:28px 32px 20px;text-align:center;border-bottom:none;">
              <a href="${appHref}" style="text-decoration:none;display:inline-block;">
                <img src="${logo}" alt="PropEZ" width="160" height="46" style="display:block;margin:0 auto;max-width:160px;height:auto;border:0;" />
              </a>
              <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:${BRAND.muted};">
                PropEZ é um produto <a href="${taggoHref}" style="color:${BRAND.orange};font-weight:600;text-decoration:none;">Taggo</a>
              </p>
            </td>
          </tr>
          <!-- Corpo -->
          <tr>
            <td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-top:1px solid ${BRAND.border};border-radius:0 0 16px 16px;padding:8px 32px 36px;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <!-- Rodapé -->
          <tr>
            <td style="padding:28px 12px 0;text-align:center;">
              <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:${BRAND.muted};">
                <a href="${appHref}" style="color:${BRAND.text};font-weight:600;text-decoration:none;">Acessar PropEZ</a>
                <span style="color:${BRAND.subtle};"> · </span>
                <a href="${taggoHref}" style="color:${BRAND.orange};font-weight:600;text-decoration:none;">${taggoHost}</a>
              </p>
              <p style="margin:0 0 8px;font-size:11px;line-height:1.5;color:${BRAND.subtle};">
                © ${new Date().getFullYear()} Taggo. Todos os direitos reservados.
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:${BRAND.subtle};">
                Você recebeu este e-mail porque utiliza ou interagiu com o PropEZ.
              </p>
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
  return `<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${BRAND.text};letter-spacing:-0.03em;line-height:1.25;">${escapeHtml(text)}</h1>`
}

export function renderLead(text: string): string {
  return `<p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${BRAND.muted};">${text}</p>`
}

export function renderParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#3f3f46;">${text}</p>`
}

export function statusBadge(label: string, tone: 'success' | 'warning' | 'danger' | 'neutral'): string {
  const colors = {
    success: { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0' },
    warning: { bg: '#fffbeb', fg: '#b45309', border: '#fde68a' },
    danger: { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' },
    neutral: { bg: '#f4f4f5', fg: '#52525b', border: '#e4e4e7' },
  }[tone]
  return `<span style="display:inline-block;margin:0 0 20px;padding:5px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;background:${colors.bg};color:${colors.fg};border:1px solid ${colors.border};">${escapeHtml(label)}</span>`
}

export interface SummaryRow {
  label: string
  value: string
}

export function renderSummaryTable(rows: SummaryRow[]): string {
  const trs = rows
    .filter((r) => r.value)
    .map(
      (r, i) => `<tr>
        <td style="padding:${i === 0 ? '0' : '12px'} 16px 12px 0;font-size:11px;font-weight:600;color:${BRAND.muted};text-transform:uppercase;letter-spacing:0.05em;width:36%;vertical-align:top;border-top:${i === 0 ? 'none' : `1px solid ${BRAND.border}`};">${escapeHtml(r.label)}</td>
        <td style="padding:${i === 0 ? '0' : '12px'} 0 12px;font-size:14px;font-weight:500;color:${BRAND.text};vertical-align:top;border-top:${i === 0 ? 'none' : `1px solid ${BRAND.border}`};">${escapeHtml(r.value)}</td>
      </tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;background:#fafafa;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;"><tbody>${trs}</tbody></table>`
}

export function renderCtaButton(label: string, href: string, primary = true): string {
  const bg = primary ? BRAND.text : BRAND.card
  const fg = primary ? '#ffffff' : BRAND.text
  const border = primary ? BRAND.text : BRAND.border
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 16px;">
    <tr>
      <td style="border-radius:10px;background:${bg};border:1px solid ${border};">
        <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:${fg};text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`
}

export function renderSecondaryLink(label: string, href: string): string {
  return `<p style="margin:0 0 16px;font-size:13px;text-align:center;"><a href="${escapeHtml(href)}" target="_blank" style="color:${BRAND.orange};font-weight:600;text-decoration:underline;">${escapeHtml(label)}</a></p>`
}

export function renderCodeBlock(code: string): string {
  return `<div style="margin:24px 0;padding:24px 20px;background:linear-gradient(180deg,#fafafa 0%,#f4f4f5 100%);border:1px solid ${BRAND.border};border-radius:12px;text-align:center;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND.muted};">Código de verificação</p>
    <p style="margin:0;letter-spacing:10px;font-size:32px;font-weight:700;color:${BRAND.text};font-family:'SF Mono',Monaco,Consolas,monospace;">${escapeHtml(code)}</p>
  </div>`
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

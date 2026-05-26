import {
  escapeHtml,
  renderCtaButton,
  renderEmailLayout,
  renderHeading,
  renderParagraph,
} from '../layout.js'

export function renderVerificationHtml(appUrl: string, name: string, code: string): string {
  const safeName = escapeHtml(name || 'utilizador')
  const body = [
    renderHeading('Confirme o seu email'),
    renderParagraph(`Olá ${safeName}, use o código abaixo para ativar a sua conta PropEZ. O código expira em <strong>15 minutos</strong>.`),
    `<div style="margin:24px 0;padding:20px;background:#f4f4f5;border-radius:12px;text-align:center;letter-spacing:8px;font-size:28px;font-weight:700;color:#080804;">${escapeHtml(code)}</div>`,
    renderParagraph('<span style="font-size:12px;color:#a1a1aa;">Se não foi você, ignore este email.</span>'),
  ].join('')

  return renderEmailLayout({
    appUrl,
    preheader: `Seu código PropEZ: ${code}`,
    title: 'Ative a sua conta PropEZ',
    bodyHtml: body,
  })
}

export function renderResetHtml(appUrl: string, name: string, resetUrl: string): string {
  const safeName = escapeHtml(name || 'utilizador')
  const body = [
    renderHeading('Redefinir senha'),
    renderParagraph(`Olá ${safeName}, recebemos um pedido para redefinir a sua senha. O link expira em <strong>30 minutos</strong>.`),
    renderCtaButton('Redefinir senha', resetUrl),
    renderParagraph('<span style="font-size:12px;color:#a1a1aa;">Se não foi você, ignore este email.</span>'),
  ].join('')

  return renderEmailLayout({
    appUrl,
    preheader: 'Link para redefinir sua senha PropEZ',
    title: 'Redefinir senha PropEZ',
    bodyHtml: body,
  })
}

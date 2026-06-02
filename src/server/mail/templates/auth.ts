import type { EmailBranding } from '../layout.js'
import {
  escapeHtml,
  renderCodeBlock,
  renderCtaButton,
  renderEmailLayout,
  renderHeading,
  renderLead,
  renderParagraph,
} from '../layout.js'

export function renderVerificationHtml(
  branding: EmailBranding,
  name: string,
  code: string,
): string {
  const safeName = escapeHtml(name || 'utilizador')
  const body = [
    renderHeading('Confirme o seu email'),
    renderLead(`Olá <strong>${safeName}</strong>, bem-vindo ao PropEZ. Use o código abaixo para ativar a sua conta.`),
    renderCodeBlock(code),
    renderParagraph(
      'O código expira em <strong>15 minutos</strong>. Se não criou uma conta, ignore este e-mail.',
    ),
  ].join('')

  return renderEmailLayout({
    branding,
    preheader: `Seu código PropEZ: ${code}`,
    title: 'Ative a sua conta PropEZ',
    bodyHtml: body,
  })
}

export function renderEmailChangeHtml(
  branding: EmailBranding,
  name: string,
  code: string,
  newEmail: string,
): string {
  const safeName = escapeHtml(name || 'utilizador')
  const safeEmail = escapeHtml(newEmail)
  const body = [
    renderHeading('Confirmar novo e-mail'),
    renderLead(
      `Olá <strong>${safeName}</strong>, recebemos um pedido para alterar o e-mail da sua conta PropEZ para <strong>${safeEmail}</strong>.`,
    ),
    renderCodeBlock(code),
    renderParagraph(
      'Use o código acima para confirmar a alteração. Expira em <strong>15 minutos</strong>. Se não foi você, ignore este e-mail.',
    ),
  ].join('')

  return renderEmailLayout({
    branding,
    preheader: `Confirme seu novo e-mail PropEZ: ${code}`,
    title: 'Confirmar novo e-mail PropEZ',
    bodyHtml: body,
  })
}

export function renderResetHtml(
  branding: EmailBranding,
  name: string,
  resetUrl: string,
): string {
  const safeName = escapeHtml(name || 'utilizador')
  const body = [
    renderHeading('Redefinir senha'),
    renderLead(`Olá <strong>${safeName}</strong>, recebemos um pedido para redefinir a senha da sua conta PropEZ.`),
    renderCtaButton('Redefinir minha senha', resetUrl),
    renderParagraph(
      'O link expira em <strong>30 minutos</strong>. Se não foi você, ignore este e-mail — sua senha permanece a mesma.',
    ),
  ].join('')

  return renderEmailLayout({
    branding,
    preheader: 'Link para redefinir sua senha PropEZ',
    title: 'Redefinir senha PropEZ',
    bodyHtml: body,
  })
}

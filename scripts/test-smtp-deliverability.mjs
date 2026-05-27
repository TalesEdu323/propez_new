/**
 * Diagnóstico de entrega SMTP (Hostinger / Gmail).
 * Uso: node scripts/test-smtp-deliverability.mjs destino@email.com
 */
import 'dotenv/config'
import nodemailer from 'nodemailer'

const to = process.argv[2]
if (!to) {
  console.error('Uso: node scripts/test-smtp-deliverability.mjs destino@email.com')
  process.exit(1)
}

const host = process.env.SMTP_HOST || process.env.EMAIL_HOST
const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465)
const secure = String(process.env.SMTP_SECURE ?? process.env.EMAIL_SECURE ?? port === 465)
  .toLowerCase()
  .match(/^(1|true|yes)$/) !== null
const user = (process.env.SMTP_USER || process.env.EMAIL_USER)?.trim()
const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS)?.trim()
const mailFrom = process.env.MAIL_FROM?.trim() || user

if (!host || !user || !pass) {
  console.error('[deliverability] SMTP_HOST, SMTP_USER e SMTP_PASS são obrigatórios no .env')
  process.exit(1)
}

console.log('── Configuração ──')
console.log(`SMTP: ${host}:${port} secure=${secure}`)
console.log(`USER: ${user}`)
console.log(`MAIL_FROM: ${mailFrom}`)

console.log('\n── DNS (consulta pública) ──')
try {
  const spfRes = await fetch(
    'https://dns.google/resolve?name=taggo.com.br&type=TXT',
  ).then((r) => r.json())
  const spfRecords = (spfRes.Answer ?? [])
    .map((a) => a.data?.replace(/^"|"$/g, ''))
    .filter((t) => t?.startsWith('v=spf1'))
  if (spfRecords.length === 0) {
    console.log('• SPF: nenhum registro encontrado — configure no Cloudflare.')
  } else if (spfRecords.length === 1) {
    console.log('• SPF: OK (1 registro)', spfRecords[0])
  } else {
    console.log('• SPF: PROBLEMA —', spfRecords.length, 'registros (deve ser apenas 1):')
    spfRecords.forEach((r) => console.log('   ', r))
  }

  const dkimNames = [
    'hostingermail-a._domainkey.taggo.com.br',
    'hostingermail-b._domainkey.taggo.com.br',
    'default._domainkey.taggo.com.br',
  ]
  let dkimOk = false
  for (const name of dkimNames) {
    const dkimRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=CNAME`,
    ).then((r) => r.json())
    if (dkimRes.Answer?.length) {
      console.log('• DKIM: OK', name, '→', dkimRes.Answer[0].data)
      dkimOk = true
      break
    }
  }
  if (!dkimOk) {
    console.log(
      '• DKIM: não encontrado — ative no Hostinger (E-mail → Domínios → taggo.com.br → DKIM) e publique o CNAME no Cloudflare.',
    )
  }
} catch (err) {
  console.log('• DNS: não foi possível consultar automaticamente:', err.message)
}

const transport = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  logger: process.env.DEBUG_SMTP === 'true',
  debug: process.env.DEBUG_SMTP === 'true',
  connectionTimeout: Number(process.env.SMTP_TIMEOUT || 30000),
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 8000),
})

const stamp = new Date().toISOString()
const subject = `PropEZ deliverability test ${stamp}`

console.log('\n── Envio com envelope alinhado ao SMTP_USER ──')
const info = await transport.sendMail({
  from: mailFrom,
  to,
  replyTo: user,
  subject,
  text: `Teste PropEZ ${stamp}\nRemetente SMTP: ${user}\nSe não chegou, verifique spam e SPF/DKIM no Hostinger/Cloudflare.`,
  html: `<p>Teste PropEZ <strong>${stamp}</strong></p><p>Remetente SMTP: ${user}</p>`,
  headers: { 'X-PropEZ-Test': 'deliverability' },
  envelope: { from: user, to: [to] },
})

console.log('\n── Resultado SMTP ──')
console.log('messageId:', info.messageId)
console.log('accepted:', info.accepted)
console.log('rejected:', info.rejected)
console.log('response:', info.response)

console.log('\nPróximos passos se ainda não chegar:')
console.log('1. Hostinger → E-mails → Logs / fila de envio (status: entregue ou bounce?)')
console.log('2. Gmail → buscar pelo assunto acima em "Todos os e-mails" e "Spam"')
console.log('3. Se DKIM ausente: concluir DKIM no Hostinger + Cloudflare e aguardar propagação (até 24h)')

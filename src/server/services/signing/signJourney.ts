import type { Pool } from 'pg';
import type { MailClient } from '../../mail/client.js';
import type { EnvironmentConfig } from '../../env.js';
import { flowHasStep, parseProposalFlow, proposalValorFinalCents, type ProposalFlowConfig, journeyMethodOrder } from '../../../types/proposalFlow.js';
import { notifyProposalEventAsync } from '../notificationService.js';

export type JourneyMethodId = 'SIGNATURE_ON_SCREEN' | 'EMAIL_OTP' | 'PAYMENT';

export interface JourneyMethod {
  id: JourneyMethodId;
  name: string;
  description: string;
  icon: string;
  order: number;
  available: boolean;
  completed: boolean;
}

export interface AuthDataShape {
  identityValidatedAt?: string;
  signerName?: string;
  signerCpf?: string;
  methodDetails?: Partial<Record<JourneyMethodId, { completedAt?: string; signatureImage?: string }>>;
  otp?: { codeHash?: string; expiresAt?: string; attempts?: number };
}

export interface LinkProposalContext {
  linkId: string;
  token: string;
  documentId: string;
  proposalId: string | null;
  signerEmail: string;
  signerName: string;
  used: boolean;
  authenticationData: AuthDataShape;
  fluxo: ProposalFlowConfig;
  publicToken: string | null;
  valorCents: number | null;
  descontoCents: number | null;
  chavePix: string | null;
  linkPagamento: string | null;
  whatsappComprovante: string | null;
  title: string;
}

function parseAuthData(raw: unknown): AuthDataShape {
  if (!raw || typeof raw !== 'object') return {};
  return raw as AuthDataShape;
}

function isMethodCompleted(auth: AuthDataShape, id: JourneyMethodId): boolean {
  return Boolean(auth.methodDetails?.[id]?.completedAt);
}

export function buildJourneyMethods(fluxo: ProposalFlowConfig, auth: AuthDataShape): JourneyMethod[] {
  const methodDefs: Record<JourneyMethodId, Omit<JourneyMethod, 'order' | 'completed'>> = {
    SIGNATURE_ON_SCREEN: {
      id: 'SIGNATURE_ON_SCREEN',
      name: 'Assinatura na tela',
      description: 'Desenhe ou digite sua assinatura digital',
      icon: '✎',
      available: true,
    },
    EMAIL_OTP: {
      id: 'EMAIL_OTP',
      name: 'Código por e-mail',
      description: 'Receba um código de verificação no seu e-mail',
      icon: '📧',
      available: true,
    },
    PAYMENT: {
      id: 'PAYMENT',
      name: 'Pagamento',
      description: 'Efetue o pagamento acordado na proposta',
      icon: '💳',
      available: true,
    },
  };

  const orderedIds = journeyMethodOrder(fluxo);
  return orderedIds.map((id, index) => ({
    ...methodDefs[id],
    order: (index + 1) * 100,
    completed: isMethodCompleted(auth, id),
  }));
}

export function journeyProgress(methods: JourneyMethod[]) {
  const available = methods.filter((m) => m.available);
  const completedCount = available.filter((m) => m.completed).length;
  const nextMethodId = available.find((m) => !m.completed)?.id ?? null;
  const allCompleted = available.length > 0 && completedCount === available.length;
  return { completedCount, totalSteps: available.length, nextMethodId, allCompleted };
}

export async function loadLinkProposalContext(pool: Pool, token: string): Promise<LinkProposalContext | null> {
  const { rows } = await pool.query<{
    id: string;
    token: string;
    document_id: string;
    signer_email: string;
    signer_name: string;
    used: boolean;
    authentication_data: unknown;
    title: string;
    proposta_id: string | null;
    public_token: string | null;
    fluxo: unknown;
    valor_cents: number | null;
    desconto_cents: number | null;
    chave_pix: string | null;
    link_pagamento: string | null;
    whatsapp_comprovante: string | null;
  }>(
    `SELECT sl.id, sl.token, sl.document_id, sl.signer_email, sl.signer_name, sl.used,
            sl.authentication_data, cd.title, cd.proposta_id,
            p.public_token, p.fluxo, p.valor_cents, p.desconto_cents, p.chave_pix, p.link_pagamento, p.whatsapp_comprovante
     FROM signature_links sl
     JOIN contract_documents cd ON cd.id = sl.document_id
     LEFT JOIN propostas p ON p.id = cd.proposta_id
     WHERE sl.token = $1`,
    [token],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    linkId: row.id,
    token: row.token,
    documentId: row.document_id,
    proposalId: row.proposta_id,
    signerEmail: row.signer_email,
    signerName: row.signer_name,
    used: row.used,
    authenticationData: parseAuthData(row.authentication_data),
    fluxo: parseProposalFlow(row.fluxo),
    publicToken: row.public_token,
    valorCents: row.valor_cents,
    descontoCents: row.desconto_cents,
    chavePix: row.chave_pix,
    linkPagamento: row.link_pagamento,
    whatsappComprovante: row.whatsapp_comprovante,
    title: row.title,
  };
}

async function updateAuthData(pool: Pool, linkId: string, auth: AuthDataShape): Promise<void> {
  await pool.query(`UPDATE signature_links SET authentication_data = $2::jsonb WHERE id = $1`, [
    linkId,
    JSON.stringify(auth),
  ]);
}

export async function confirmIdentity(deps: {
  pool: Pool;
  token: string;
  name: string;
  cpf?: string;
}): Promise<{ ok: boolean; error?: string; status?: number }> {
  const ctx = await loadLinkProposalContext(deps.pool, deps.token);
  if (!ctx) return { ok: false, error: 'Link inválido', status: 404 };
  if (ctx.used) return { ok: false, error: 'Link já utilizado', status: 409 };
  const auth = { ...ctx.authenticationData };
  auth.identityValidatedAt = new Date().toISOString();
  auth.signerName = deps.name.trim() || ctx.signerName;
  if (deps.cpf?.trim()) auth.signerCpf = deps.cpf.trim();
  await updateAuthData(deps.pool, ctx.linkId, auth);
  return { ok: true };
}

export async function saveScreenSignature(deps: {
  pool: Pool;
  token: string;
  signatureImage: string;
}): Promise<{ ok: boolean; error?: string; status?: number }> {
  const ctx = await loadLinkProposalContext(deps.pool, deps.token);
  if (!ctx) return { ok: false, error: 'Link inválido', status: 404 };
  if (!ctx.authenticationData.identityValidatedAt) {
    return { ok: false, error: 'Confirme sua identidade antes de assinar', status: 409 };
  }
  const methods = buildJourneyMethods(ctx.fluxo, ctx.authenticationData);
  const progress = journeyProgress(methods);
  if (progress.nextMethodId !== 'SIGNATURE_ON_SCREEN') {
    return { ok: false, error: 'Complete os passos anteriores primeiro', status: 409 };
  }
  if (!deps.signatureImage?.startsWith('data:image')) {
    return { ok: false, error: 'Imagem de assinatura inválida', status: 400 };
  }
  const auth = { ...ctx.authenticationData };
  auth.methodDetails = {
    ...auth.methodDetails,
    SIGNATURE_ON_SCREEN: {
      completedAt: new Date().toISOString(),
      signatureImage: deps.signatureImage,
    },
  };
  await updateAuthData(deps.pool, ctx.linkId, auth);
  return { ok: true };
}

function hashOtp(code: string): string {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) | 0;
  return String(h);
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestEmailOtp(deps: {
  pool: Pool;
  mail?: MailClient;
  token: string;
}): Promise<{ ok: boolean; error?: string; status?: number }> {
  const ctx = await loadLinkProposalContext(deps.pool, deps.token);
  if (!ctx) return { ok: false, error: 'Link inválido', status: 404 };
  if (!ctx.authenticationData.identityValidatedAt) {
    return { ok: false, error: 'Confirme sua identidade primeiro', status: 409 };
  }
  const methods = buildJourneyMethods(ctx.fluxo, ctx.authenticationData);
  const progress = journeyProgress(methods);
  if (progress.nextMethodId !== 'EMAIL_OTP' && !isMethodCompleted(ctx.authenticationData, 'EMAIL_OTP')) {
    if (!isMethodCompleted(ctx.authenticationData, 'SIGNATURE_ON_SCREEN')) {
      return { ok: false, error: 'Conclua a assinatura na tela primeiro', status: 409 };
    }
  }
  const code = generateOtp();
  const auth = { ...ctx.authenticationData };
  auth.otp = {
    codeHash: hashOtp(code),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    attempts: 0,
  };
  await updateAuthData(deps.pool, ctx.linkId, auth);

  if (deps.mail) {
    try {
      await deps.mail.sendVerificationEmail({
        to: ctx.signerEmail,
        name: ctx.signerName || ctx.signerEmail,
        code,
      });
    } catch {
      return { ok: false, error: 'Não foi possível enviar o e-mail. Tente novamente.', status: 503 };
    }
  } else if (process.env.NODE_ENV !== 'production') {
    console.info(`[signJourney] OTP dev ${ctx.signerEmail}: ${code}`);
  } else {
    return { ok: false, error: 'Serviço de e-mail indisponível', status: 503 };
  }
  return { ok: true };
}

export async function verifyEmailOtp(deps: {
  pool: Pool;
  token: string;
  code: string;
}): Promise<{ ok: boolean; error?: string; status?: number }> {
  const ctx = await loadLinkProposalContext(deps.pool, deps.token);
  if (!ctx) return { ok: false, error: 'Link inválido', status: 404 };
  const otp = ctx.authenticationData.otp;
  if (!otp?.codeHash || !otp.expiresAt) {
    return { ok: false, error: 'Solicite um código primeiro', status: 400 };
  }
  if (new Date(otp.expiresAt) < new Date()) {
    return { ok: false, error: 'Código expirado. Solicite um novo.', status: 410 };
  }
  const attempts = (otp.attempts ?? 0) + 1;
  if (attempts > 5) {
    return { ok: false, error: 'Muitas tentativas. Solicite um novo código.', status: 429 };
  }
  if (hashOtp(deps.code.trim()) !== otp.codeHash) {
    const auth = { ...ctx.authenticationData, otp: { ...otp, attempts } };
    await updateAuthData(deps.pool, ctx.linkId, auth);
    return { ok: false, error: 'Código inválido', status: 400 };
  }
  const auth = { ...ctx.authenticationData };
  auth.methodDetails = {
    ...auth.methodDetails,
    EMAIL_OTP: { completedAt: new Date().toISOString() },
  };
  delete auth.otp;
  await updateAuthData(deps.pool, ctx.linkId, auth);
  return { ok: true };
}

export async function completePaymentStep(deps: {
  pool: Pool;
  token: string;
  mail?: MailClient;
  config?: EnvironmentConfig;
}): Promise<{ ok: boolean; error?: string; status?: number }> {
  const ctx = await loadLinkProposalContext(deps.pool, deps.token);
  if (!ctx) return { ok: false, error: 'Link inválido', status: 404 };
  if (!flowHasStep(ctx.fluxo, 'pay')) {
    return { ok: false, error: 'Pagamento não faz parte deste fluxo', status: 400 };
  }
  const methods = buildJourneyMethods(ctx.fluxo, ctx.authenticationData);
  const progress = journeyProgress(methods);
  if (progress.nextMethodId !== 'PAYMENT') {
    return { ok: false, error: 'Complete os passos anteriores primeiro', status: 409 };
  }
  const auth = { ...ctx.authenticationData };
  auth.methodDetails = {
    ...auth.methodDetails,
    PAYMENT: { completedAt: new Date().toISOString() },
  };
  await updateAuthData(deps.pool, ctx.linkId, auth);
  await deps.pool.query(
    `UPDATE propostas p
     SET pago = true, data_pagamento = NOW()
     FROM contract_documents cd
     JOIN signature_links sl ON sl.document_id = cd.id
     WHERE sl.id = $1 AND p.id = cd.proposta_id AND cd.proposta_id IS NOT NULL`,
    [ctx.linkId],
  );
  if (ctx.proposalId && deps.mail && deps.config) {
    notifyProposalEventAsync({
      pool: deps.pool,
      mail: deps.mail,
      config: deps.config,
      proposalId: ctx.proposalId,
      type: 'proposal_paid',
    });
  }
  return { ok: true };
}

export function getStoredSignatureImage(auth: AuthDataShape): string | null {
  return auth.methodDetails?.SIGNATURE_ON_SCREEN?.signatureImage ?? null;
}

export function assertJourneyReady(ctx: LinkProposalContext): { ok: boolean; error?: string } {
  if (!ctx.authenticationData.identityValidatedAt) {
    return { ok: false, error: 'Identidade não confirmada' };
  }
  const methods = buildJourneyMethods(ctx.fluxo, ctx.authenticationData);
  const { allCompleted } = journeyProgress(methods);
  if (!allCompleted) {
    return { ok: false, error: 'Conclua todos os passos antes de finalizar' };
  }
  const img = getStoredSignatureImage(ctx.authenticationData);
  if (flowHasStep(ctx.fluxo, 'sign') && !img) {
    return { ok: false, error: 'Assinatura na tela não registrada' };
  }
  return { ok: true };
}

export async function getJourneyMethodsPayload(pool: Pool, token: string) {
  const ctx = await loadLinkProposalContext(pool, token);
  if (!ctx) return null;
  const methods = buildJourneyMethods(ctx.fluxo, ctx.authenticationData);
  const progress = journeyProgress(methods);
  return {
    methods,
    ...progress,
    identityValidated: Boolean(ctx.authenticationData.identityValidatedAt),
    fluxo: ctx.fluxo,
    payment: flowHasStep(ctx.fluxo, 'pay')
      ? {
          valorCents: proposalValorFinalCents(ctx.valorCents, ctx.descontoCents ?? 0),
          chavePix: ctx.chavePix,
          linkPagamento: ctx.linkPagamento,
          whatsappComprovante: ctx.whatsappComprovante,
        }
      : null,
  };
}

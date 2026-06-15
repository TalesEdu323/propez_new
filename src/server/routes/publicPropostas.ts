import express from 'express';
import type { Request, Response, Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { serializeProposta } from '../db/serializers.js';
import type { SuiteProposalEventsClient } from '../clients/suiteProposalEvents.js';
import type { EnvironmentConfig } from '../env.js';
import type { MailClient } from '../mail/client.js';
import { notifyProposalEventAsync } from '../services/notificationService.js';
import {
  buildJourneyPayload,
  confirmClientReceipt,
  triggerContractSignAfterApproval,
  readSignedPdfForProposal,
} from '../services/proposalJourney.js';
import { flowHasStep, parseProposalFlow, shouldTriggerContractSign } from '../../types/proposalFlow.js';
import { PROPOSTA_FIELDS } from '../db/propostaColumns.js';
import type { IntegrationsConfig } from '../config.js';
import type { EnsureSuiteCredential } from '../integrations/ensureSuiteCredential.js';
import type { OrgIntegrationCredentialsRepo } from '../storage/orgIntegrationCredentials.js';
import { captureHandledErrorDetail } from '../services/apiErrorTracking.js';
import {
  conflictDecisionMessage,
  resolvePublicDecisionIntent,
  targetStatusForAction,
  type ProposalDecisionStatus,
} from './publicPropostaDecisionHelpers.js';

const approveSchema = z.object({
  action: z.enum(['approve', 'reject']),
  clientName: z.string().trim().max(200).optional(),
  clientDocument: z.string().trim().max(50).optional(),
  clientEmail: z
    .string()
    .trim()
    .max(200)
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: 'E-mail inválido' }),
});

async function fetchPropostaRowByToken(pool: Pool, token: string) {
  const { rows } = await pool.query(
    `SELECT ${PROPOSTA_FIELDS}, organization_id FROM propostas WHERE public_token = $1`,
    [token],
  );
  return rows[0] ?? null;
}

function respondWithProposta(
  res: Response,
  row: Record<string, unknown>,
  extra?: { warning?: string; alreadyDecided?: boolean },
) {
  return res.json({
    proposta: serializeProposta(row),
    journey: buildJourneyPayload(row),
    ...extra,
  });
}

export function createPublicPropostasRouter(deps: {
  pool: Pool;
  mail: MailClient;
  suiteProposalEvents?: SuiteProposalEventsClient;
  config?: EnvironmentConfig;
  integrationsConfig?: IntegrationsConfig;
  orgCredentialsRepo?: OrgIntegrationCredentialsRepo;
  ensureSuiteCredential?: EnsureSuiteCredential;
}): Router {
  const {
    pool,
    mail,
    suiteProposalEvents,
    config,
  } = deps;
  const router = express.Router();

  router.get('/:token/contract-signed.pdf', async (req: Request, res: Response) => {
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token obrigatório' });
    try {
      const { rows } = await pool.query<{ id: string }>(
        `SELECT id FROM propostas WHERE public_token = $1`,
        [token],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' });
      const buffer = await readSignedPdfForProposal(pool, String(rows[0].id));
      if (!buffer) return res.status(404).json({ error: 'Contrato assinado ainda não disponível' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="contrato-assinado.pdf"');
      return res.send(buffer);
    } catch (err) {
      console.error('[public/contract-signed.pdf] erro:', err);
      return res.status(500).json({ error: 'Erro ao carregar contrato assinado' });
    }
  });

  router.get('/:token/journey', async (req: Request, res: Response) => {
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token obrigatório' });
    try {
      const { rows } = await pool.query(
        `SELECT organization_id, ${PROPOSTA_FIELDS}
         FROM propostas WHERE public_token = $1`,
        [token],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' });
      const row = rows[0];
      return res.json({
        proposta: serializeProposta(row),
        journey: buildJourneyPayload(row),
      });
    } catch (err) {
      console.error('[public/journey] erro:', err);
      return res.status(500).json({ error: 'Erro ao carregar jornada' });
    }
  });

  router.get('/:token', async (req: Request, res: Response) => {
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token obrigatório' });
    try {
      const { rows } = await pool.query(
        `SELECT p.organization_id, o.name AS org_name, o.logo_url, o.signature_url, o.cnpj, o.plan,
                o.primary_color, o.secondary_color, o.whitelabel_enabled,
                p.viewed_at,
                ${PROPOSTA_FIELDS.split(',').map((c) => `p.${c.trim()}`).join(', ')}
         FROM propostas p
         JOIN organizations o ON o.id = p.organization_id
         WHERE p.public_token = $1`,
        [token],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' });
      const r = rows[0];

      if (!r.viewed_at && config) {
        await pool.query(
          `UPDATE propostas SET viewed_at = NOW() WHERE public_token = $1 AND viewed_at IS NULL`,
          [token],
        );
        notifyProposalEventAsync({
          pool,
          mail,
          config,
          proposalId: String(r.id),
          type: 'proposal_viewed',
        });
        if (suiteProposalEvents?.isEnabled() && r.prosync_lead_id) {
          const valor = typeof r.valor_cents === 'number' ? r.valor_cents : null;
          const desconto = typeof r.desconto_cents === 'number' ? r.desconto_cents : 0;
          const finalValueCents = valor != null ? Math.max(0, valor - desconto) : null;
          const baseUrl = config.appUrl.replace(/\/+$/, '');
          const publicUrl = r.public_token ? `${baseUrl}/p/${r.public_token}` : null;
          suiteProposalEvents.fireAndForget({
            propezOrganizationId: String(r.organization_id),
            event: 'proposal.viewed',
            externalId: String(r.id),
            leadId: String(r.prosync_lead_id),
            title: r.cliente_nome
              ? `Proposta para ${r.cliente_nome}`
              : `Proposta ${String(r.id).slice(0, 8)}`,
            publicUrl,
            status: r.status ?? 'pendente',
            valueCents: finalValueCents,
            currency: 'BRL',
            externalUpdatedAt: new Date(),
          });
        }
      }

      const propostaRow = r;

      return res.json({
        proposta: serializeProposta(propostaRow),
        organization: {
          id: r.organization_id,
          name: r.org_name,
          cnpj: r.cnpj,
          logoUrl: r.logo_url,
          signatureUrl: r.signature_url,
          primaryColor: r.primary_color ?? null,
          secondaryColor: r.secondary_color ?? null,
          whitelabelEnabled: r.whitelabel_enabled === true,
          plan: r.plan,
        },
        journey: buildJourneyPayload(propostaRow),
      });
    } catch (err) {
      console.error('[public/proposta] erro:', err);
      return res.status(500).json({ error: 'Erro ao carregar proposta' });
    }
  });

  router.post('/:token/decision', async (req: Request, res: Response) => {
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token obrigatório' });
    const parsed = approveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    }
    const { action, clientName, clientEmail, clientDocument } = parsed.data;

    try {
      const targetStatus = targetStatusForAction(action);
      const current = await pool.query<{ status: string; fluxo: unknown; pago: boolean }>(
        `SELECT status, fluxo, pago FROM propostas WHERE public_token = $1`,
        [token],
      );
      if (!current.rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' });

      const currentStatus = current.rows[0].status as ProposalDecisionStatus;
      const intent = resolvePublicDecisionIntent(currentStatus, action);

      if (intent === 'idempotent_ok') {
        const row = await fetchPropostaRowByToken(pool, token);
        if (!row) return res.status(404).json({ error: 'Proposta não encontrada' });
        return respondWithProposta(res, row, { alreadyDecided: true });
      }

      if (intent === 'conflict') {
        return res.status(409).json({
          error: conflictDecisionMessage(currentStatus, action),
        });
      }

      const fluxo = parseProposalFlow(current.rows[0].fluxo);
      if (action === 'approve') {
        if (!clientDocument?.trim()) {
          return res.status(400).json({ error: 'Informe CPF ou CNPJ para aprovar a proposta' });
        }
        if (flowHasStep(fluxo, 'sign') && !clientEmail?.trim()) {
          return res.status(400).json({ error: 'Informe o e-mail para prosseguir com a assinatura do contrato' });
        }
      }

      const emailNorm = clientEmail?.trim().toLowerCase() ?? null;

      const { rows } = await pool.query(
        `UPDATE propostas SET
           status = $2,
           cliente_nome = COALESCE($3, cliente_nome),
           cliente_email = COALESCE(NULLIF($4, ''), cliente_email),
           cliente_documento = COALESCE(NULLIF($5, ''), cliente_documento),
           data_envio = COALESCE(data_envio, NOW())
         WHERE public_token = $1 AND status = 'pendente'
         RETURNING ${PROPOSTA_FIELDS}, organization_id`,
        [token, targetStatus, clientName ?? null, emailNorm, clientDocument ?? null],
      );

      if (!rows[0]) {
        const row = await fetchPropostaRowByToken(pool, token);
        if (!row) return res.status(404).json({ error: 'Proposta não encontrada' });
        const retryIntent = resolvePublicDecisionIntent(String(row.status) as ProposalDecisionStatus, action);
        if (retryIntent === 'idempotent_ok') {
          return respondWithProposta(res, row, { alreadyDecided: true });
        }
        return res.status(409).json({
          error: conflictDecisionMessage(String(row.status) as ProposalDecisionStatus, action),
        });
      }

      let updated = rows[0];
      let warning: string | undefined;

      try {
        if (targetStatus === 'aprovada' && config) {
          const fluxoAfter = parseProposalFlow(updated.fluxo);
          if (shouldTriggerContractSign(fluxoAfter, { pago: !!updated.pago })) {
            try {
              const signResult = await triggerContractSignAfterApproval({
                pool,
                envConfig: config,
                mail,
                proposalId: String(updated.id),
                organizationId: String(updated.organization_id),
              });
              if (signResult.error && !signResult.skipped) {
                warning = signResult.error;
              }
            } catch (signErr) {
              console.error('[public/decision] contract sign failed:', signErr);
              warning =
                signErr instanceof Error
                  ? signErr.message
                  : 'Não foi possível preparar a assinatura do contrato.';
            }
          }
          const { rows: afterSign } = await pool.query(
            `SELECT ${PROPOSTA_FIELDS}, organization_id FROM propostas WHERE public_token = $1`,
            [token],
          );
          if (afterSign[0]) updated = afterSign[0];
        }

        if (suiteProposalEvents?.isEnabled() && updated.prosync_lead_id && config) {
          const valor = typeof updated.valor_cents === 'number' ? updated.valor_cents : null;
          const desconto = typeof updated.desconto_cents === 'number' ? updated.desconto_cents : 0;
          const finalValueCents = valor != null ? Math.max(0, valor - desconto) : null;
          const baseUrl = config.appUrl.replace(/\/+$/, '');
          const publicUrl = updated.public_token ? `${baseUrl}/p/${updated.public_token}` : null;
          suiteProposalEvents.fireAndForget({
            propezOrganizationId: String(updated.organization_id),
            event: targetStatus === 'aprovada' ? 'proposal.approved' : 'proposal.rejected',
            externalId: String(updated.id),
            leadId: String(updated.prosync_lead_id),
            title: updated.cliente_nome
              ? `Proposta para ${updated.cliente_nome}`
              : `Proposta ${String(updated.id).slice(0, 8)}`,
            publicUrl,
            status: targetStatus,
            valueCents: finalValueCents,
            currency: 'BRL',
            externalUpdatedAt: new Date(),
          });
        }

        if (config) {
          notifyProposalEventAsync({
            pool,
            mail,
            config,
            proposalId: String(updated.id),
            type: targetStatus === 'aprovada' ? 'proposal_approved' : 'proposal_rejected',
          });
        }
      } catch (sideErr) {
        console.error('[public/decision] side effects failed:', sideErr);
        if (!warning) {
          warning =
            sideErr instanceof Error
              ? sideErr.message
              : 'Decisão registrada, mas houve um problema ao concluir os próximos passos.';
        }
        const { rows: fresh } = await pool.query(
          `SELECT ${PROPOSTA_FIELDS}, organization_id FROM propostas WHERE public_token = $1`,
          [token],
        );
        if (fresh[0]) updated = fresh[0];
      }

      return respondWithProposta(res, updated, warning ? { warning } : undefined);
    } catch (err) {
      console.error('[public/decision] erro:', err);
      const row = await fetchPropostaRowByToken(pool, token).catch(() => null);
      if (row && String(row.status) !== 'pendente') {
        return respondWithProposta(res, row, {
          warning: 'Decisão registrada, mas houve um problema ao concluir a resposta.',
        });
      }
      captureHandledErrorDetail(err, res, { action: (req.body as { action?: string })?.action });
      return res.status(500).json({ error: 'Erro ao registrar decisão' });
    }
  });

  router.post('/:token/prepare-signature', async (req: Request, res: Response) => {
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token obrigatório' });
    if (!config) {
      return res.status(503).json({ error: 'Servidor não configurado' });
    }
    try {
      const { rows } = await pool.query(
        `SELECT id, organization_id, status, contract_signing_url, contract_sign_status
         FROM propostas WHERE public_token = $1`,
        [token],
      );
      const row = rows[0];
      if (!row) return res.status(404).json({ error: 'Proposta não encontrada' });
      if (row.status !== 'aprovada') {
        return res.status(409).json({ error: 'Aprovação da proposta é necessária antes da assinatura' });
      }

      const existingSigningUrl = row.contract_signing_url;
      const existingSignStatus = row.contract_sign_status;
      if (
        existingSigningUrl &&
        existingSignStatus !== 'failed' &&
        existingSignStatus !== 'cancelled'
      ) {
        const { rows: fresh } = await pool.query(
          `SELECT ${PROPOSTA_FIELDS} FROM propostas WHERE public_token = $1`,
          [token],
        );
        if (!fresh[0]) return res.status(404).json({ error: 'Proposta não encontrada' });
        return res.json({
          ok: true,
          signingUrl: existingSigningUrl,
          proposta: serializeProposta(fresh[0]),
          journey: buildJourneyPayload(fresh[0]),
        });
      }

      await pool.query(
        `UPDATE propostas SET
           contract_sign_status = NULL,
           contract_sign_last_sync_at = NULL,
           contract_sign_document_id = CASE
             WHEN contract_signing_url IS NULL THEN NULL
             ELSE contract_sign_document_id
           END
         WHERE public_token = $1 AND contract_sign_status IN ('failed', 'cancelled')`,
        [token],
      );

      const signResult = await triggerContractSignAfterApproval({
        pool,
        envConfig: config,
        mail,
        proposalId: String(row.id),
        organizationId: String(row.organization_id),
      });

      const { rows: fresh } = await pool.query(
        `SELECT ${PROPOSTA_FIELDS} FROM propostas WHERE public_token = $1`,
        [token],
      );
      if (!fresh[0]) return res.status(404).json({ error: 'Proposta não encontrada' });

      if (signResult.error) {
        const raw = signResult.error;
        const friendly = /unknown image format|invalid image|images dictionary/i.test(raw)
          ? 'Não foi possível gerar o PDF do contrato. Tente novamente ou contate o remetente.'
          : raw;
        console.error('[public/prepare-signature] falha:', raw);
        return res.status(502).json({
          error: friendly,
          proposta: serializeProposta(fresh[0]),
          journey: buildJourneyPayload(fresh[0]),
        });
      }
      if (signResult.skipped) {
        const skippedMessages: Record<string, string> = {
          sem_contrato: 'Esta proposta não possui contrato configurado.',
          sem_email: 'Informe um e-mail válido para gerar a assinatura.',
          sem_passo_sign: 'Esta proposta não inclui etapa de assinatura.',
          aguardando_pagamento: 'Conclua o pagamento antes de assinar o contrato.',
        };
        return res.status(409).json({
          error: skippedMessages[signResult.skipped] ?? `Não foi possível preparar assinatura (${signResult.skipped})`,
          skipped: signResult.skipped,
          proposta: serializeProposta(fresh[0]),
          journey: buildJourneyPayload(fresh[0]),
        });
      }

      const signingUrl =
        signResult.signingUrl ??
        fresh[0].contract_signing_url;

      if (!signingUrl) {
        return res.status(502).json({
          error: 'Não foi possível gerar o link de assinatura. Tente novamente.',
          proposta: serializeProposta(fresh[0]),
          journey: buildJourneyPayload(fresh[0]),
        });
      }

      return res.json({
        ok: true,
        signingUrl,
        proposta: serializeProposta(fresh[0]),
        journey: buildJourneyPayload(fresh[0]),
      });
    } catch (err) {
      console.error('[public/prepare-signature] erro:', err);
      captureHandledErrorDetail(err, res, { proposalToken: req.params.token });
      return res.status(500).json({ error: 'Erro ao preparar assinatura' });
    }
  });

  router.post('/:token/payment/complete', async (req: Request, res: Response) => {
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token obrigatório' });
    if (!config) return res.status(503).json({ error: 'Servidor não configurado' });

    try {
      const { rows } = await pool.query(
        `SELECT ${PROPOSTA_FIELDS}, organization_id FROM propostas WHERE public_token = $1`,
        [token],
      );
      const row = rows[0];
      if (!row) return res.status(404).json({ error: 'Proposta não encontrada' });
      if (row.status !== 'aprovada') {
        return res.status(409).json({ error: 'A proposta precisa estar aprovada antes do pagamento' });
      }
      if (row.pago) {
        return res.json({
          proposta: serializeProposta(row),
          journey: buildJourneyPayload(row),
        });
      }

      const fluxo = parseProposalFlow(row.fluxo);
      if (!flowHasStep(fluxo, 'pay')) {
        return res.status(400).json({ error: 'Pagamento não faz parte deste fluxo' });
      }

      const { rows: updatedRows } = await pool.query(
        `UPDATE propostas SET pago = true, data_pagamento = NOW()
         WHERE public_token = $1
         RETURNING ${PROPOSTA_FIELDS}, organization_id`,
        [token],
      );
      const updated = updatedRows[0];
      if (!updated) return res.status(404).json({ error: 'Proposta não encontrada' });

      notifyProposalEventAsync({
        pool,
        mail,
        config,
        proposalId: String(updated.id),
        type: 'proposal_paid',
      });

      if (shouldTriggerContractSign(fluxo, { pago: true })) {
        await triggerContractSignAfterApproval({
          pool,
          envConfig: config,
          mail,
          proposalId: String(updated.id),
          organizationId: String(updated.organization_id),
        });
        const { rows: afterSign } = await pool.query(
          `SELECT ${PROPOSTA_FIELDS}, organization_id FROM propostas WHERE public_token = $1`,
          [token],
        );
        if (afterSign[0]) Object.assign(updated, afterSign[0]);
      }

      return res.json({
        proposta: serializeProposta(updated),
        journey: buildJourneyPayload(updated),
      });
    } catch (err) {
      console.error('[public/payment/complete] erro:', err);
      return res.status(500).json({ error: 'Erro ao registrar pagamento' });
    }
  });

  router.post('/:token/confirm-receipt', async (req: Request, res: Response) => {
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token obrigatório' });
    const result = await confirmClientReceipt({ pool, token, envConfig: config, mail });
    if (!result.ok) {
      return res.status(result.status ?? 400).json({ error: result.error });
    }
    const { rows } = await pool.query(
      `SELECT ${PROPOSTA_FIELDS} FROM propostas WHERE public_token = $1`,
      [token],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' });
    return res.json({
      proposta: serializeProposta(rows[0]),
      journey: buildJourneyPayload(rows[0]),
    });
  });

  return router;
}

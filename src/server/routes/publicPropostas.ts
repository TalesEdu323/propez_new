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
import { PROPOSTA_SELECT, PROPOSTA_FIELDS } from '../db/propostaColumns.js';
import type { IntegrationsConfig } from '../config.js';
import type { EnsureSuiteCredential } from '../integrations/ensureSuiteCredential.js';
import type { OrgIntegrationCredentialsRepo } from '../storage/orgIntegrationCredentials.js';

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
    integrationsConfig,
    orgCredentialsRepo,
    ensureSuiteCredential,
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
      const status = action === 'approve' ? 'aprovada' : 'recusada';
      const current = await pool.query<{ status: string }>(
        `SELECT status FROM propostas WHERE public_token = $1`,
        [token],
      );
      if (!current.rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' });
      if (current.rows[0].status !== 'pendente') {
        return res.status(409).json({ error: 'Decisão já registrada para esta proposta' });
      }

      const emailNorm = clientEmail?.trim().toLowerCase() ?? null;

      const { rows } = await pool.query(
        `UPDATE propostas SET
           status = $2,
           cliente_nome = COALESCE($3, cliente_nome),
           cliente_email = COALESCE(NULLIF($4, ''), cliente_email),
           cliente_documento = COALESCE(NULLIF($5, ''), cliente_documento),
           data_envio = COALESCE(data_envio, NOW())
         WHERE public_token = $1
         RETURNING ${PROPOSTA_FIELDS}, organization_id`,
        [token, status, clientName ?? null, emailNorm, clientDocument ?? null],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' });
      const updated = rows[0];

      if (status === 'aprovada' && config) {
        await triggerContractSignAfterApproval({
          pool,
          envConfig: config,
          mail,
          proposalId: String(updated.id),
          organizationId: String(updated.organization_id),
        });
        const { rows: afterSign } = await pool.query(
          `SELECT ${PROPOSTA_FIELDS} FROM propostas WHERE public_token = $1`,
          [token],
        );
        if (afterSign[0]) Object.assign(updated, afterSign[0]);
      }

      if (suiteProposalEvents?.isEnabled() && updated.prosync_lead_id && config) {
        const valor = typeof updated.valor_cents === 'number' ? updated.valor_cents : null;
        const desconto = typeof updated.desconto_cents === 'number' ? updated.desconto_cents : 0;
        const finalValueCents = valor != null ? Math.max(0, valor - desconto) : null;
        const baseUrl = config.appUrl.replace(/\/+$/, '');
        const publicUrl = updated.public_token ? `${baseUrl}/p/${updated.public_token}` : null;
        suiteProposalEvents.fireAndForget({
          propezOrganizationId: String(updated.organization_id),
          event: status === 'aprovada' ? 'proposal.approved' : 'proposal.rejected',
          externalId: String(updated.id),
          leadId: String(updated.prosync_lead_id),
          title: updated.cliente_nome
            ? `Proposta para ${updated.cliente_nome}`
            : `Proposta ${String(updated.id).slice(0, 8)}`,
          publicUrl,
          status,
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
          type: status === 'aprovada' ? 'proposal_approved' : 'proposal_rejected',
        });
      }

      return res.json({
        proposta: serializeProposta(updated),
        journey: buildJourneyPayload(updated),
      });
    } catch (err) {
      console.error('[public/decision] erro:', err);
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
        `SELECT id, organization_id, status FROM propostas WHERE public_token = $1`,
        [token],
      );
      const row = rows[0];
      if (!row) return res.status(404).json({ error: 'Proposta não encontrada' });
      if (row.status !== 'aprovada') {
        return res.status(409).json({ error: 'Aprovação da proposta é necessária antes da assinatura' });
      }

      await pool.query(
        `UPDATE propostas SET contract_sign_status = NULL, contract_sign_last_sync_at = NULL
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
        return res.status(502).json({
          error: signResult.error,
          proposta: serializeProposta(fresh[0]),
          journey: buildJourneyPayload(fresh[0]),
        });
      }
      if (signResult.skipped) {
        return res.status(409).json({
          error: `Não foi possível preparar assinatura (${signResult.skipped})`,
          proposta: serializeProposta(fresh[0]),
          journey: buildJourneyPayload(fresh[0]),
        });
      }

      const signingUrl =
        signResult.signingUrl ??
        fresh[0].contract_signing_url ??
        fresh[0].rubrica_signing_url;

      return res.json({
        ok: true,
        signingUrl,
        proposta: serializeProposta(fresh[0]),
        journey: buildJourneyPayload(fresh[0]),
      });
    } catch (err) {
      console.error('[public/prepare-signature] erro:', err);
      return res.status(500).json({ error: 'Erro ao preparar assinatura' });
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

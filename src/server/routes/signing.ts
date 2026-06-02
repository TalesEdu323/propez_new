import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import type { EnvironmentConfig } from '../env.js';
import type { MailClient } from '../mail/client.js';
import {
  completeSignature,
  getSignatureLinkPublic,
  readSignedPdfForDocument,
} from '../services/signing/contractSigningService.js';
import {
  completePaymentStep,
  confirmIdentity,
  getJourneyMethodsPayload,
  requestEmailOtp,
  saveScreenSignature,
  verifyEmailOtp,
} from '../services/signing/signJourney.js';
import { buildValidityReportPayload } from '../services/signing/validityReportPayload.js';
import { readPdf } from '../services/signing/signatureStorage.js';
import type { ContractDocumentRow } from '../services/signing/types.js';

export function createSigningRouter(deps: {
  pool: Pool;
  config: EnvironmentConfig;
  mail: MailClient;
}): Router {
  const { pool, config, mail } = deps;
  const router = Router();

  router.get('/:token', async (req: Request, res: Response) => {
    const result = await getSignatureLinkPublic({ pool, token: req.params.token });
    if (!result.ok) return res.status(result.status ?? 400).json({ error: result.error });
    return res.json(result.data);
  });

  router.get('/:token/journey-methods', async (req: Request, res: Response) => {
    const payload = await getJourneyMethodsPayload(pool, req.params.token);
    if (!payload) return res.status(404).json({ error: 'Link não encontrado' });
    return res.json({ success: true, ...payload });
  });

  router.post('/:token/auth/identity', async (req: Request, res: Response) => {
    const name = String(req.body?.name ?? '').trim();
    const cpf = String(req.body?.cpf ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
    const result = await confirmIdentity({ pool, token: req.params.token, name, cpf: cpf || undefined });
    if (!result.ok) return res.status(result.status ?? 400).json({ error: result.error });
    const payload = await getJourneyMethodsPayload(pool, req.params.token);
    return res.json({ success: true, ...payload });
  });

  router.post('/:token/auth/signature', async (req: Request, res: Response) => {
    const signatureImage = String(req.body?.signatureImage ?? '');
    const result = await saveScreenSignature({ pool, token: req.params.token, signatureImage });
    if (!result.ok) return res.status(result.status ?? 400).json({ error: result.error });
    const payload = await getJourneyMethodsPayload(pool, req.params.token);
    return res.json({ success: true, ...payload });
  });

  router.post('/:token/auth/otp/request', async (req: Request, res: Response) => {
    const result = await requestEmailOtp({ pool, mail, token: req.params.token });
    if (!result.ok) return res.status(result.status ?? 400).json({ error: result.error });
    return res.json({ success: true });
  });

  router.post('/:token/auth/otp/verify', async (req: Request, res: Response) => {
    const code = String(req.body?.code ?? '').trim();
    if (!code) return res.status(400).json({ error: 'Código obrigatório' });
    const result = await verifyEmailOtp({ pool, token: req.params.token, code });
    if (!result.ok) return res.status(result.status ?? 400).json({ error: result.error });
    const payload = await getJourneyMethodsPayload(pool, req.params.token);
    return res.json({ success: true, ...payload });
  });

  router.post('/:token/auth/payment/complete', async (req: Request, res: Response) => {
    const result = await completePaymentStep({ pool, token: req.params.token });
    if (!result.ok) return res.status(result.status ?? 400).json({ error: result.error });
    const payload = await getJourneyMethodsPayload(pool, req.params.token);
    return res.json({ success: true, ...payload });
  });

  router.get('/:token/preview.pdf', async (req: Request, res: Response) => {
    const { rows } = await pool.query<{ document_id: string }>(
      `SELECT document_id FROM signature_links WHERE token = $1`,
      [req.params.token],
    );
    const docId = rows[0]?.document_id;
    if (!docId) return res.status(404).end();
    const { rows: docRows } = await pool.query<{ original_pdf_path: string | null; signed_pdf_path: string | null }>(
      `SELECT original_pdf_path, signed_pdf_path FROM contract_documents WHERE id = $1`,
      [docId],
    );
    const rel = docRows[0]?.signed_pdf_path || docRows[0]?.original_pdf_path;
    if (!rel) return res.status(404).end();
    try {
      const buf = await readPdf(rel, { pool });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="contrato.pdf"');
      return res.send(buf);
    } catch {
      return res.status(404).end();
    }
  });

  router.post('/:token/complete', async (req: Request, res: Response) => {
    const signatureImage = String(req.body?.signatureImage ?? req.body?.signatureData?.signatureImage ?? '');
    const result = await completeSignature({
      pool,
      envConfig: config,
      mail,
      token: req.params.token,
      signatureImage: signatureImage || undefined,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
    });
    if (!result.ok) return res.status(result.status ?? 400).json({ error: result.error });
    return res.json({ success: true, alreadyUsed: result.alreadyUsed ?? false });
  });

  return router;
}

export function createPublicValidityRouter(deps: { pool: Pool; config: EnvironmentConfig }): Router {
  const router = Router();

  router.get('/:documentId', async (req: Request, res: Response) => {
    const token = String(req.query.token ?? '');
    const { rows } = await deps.pool.query<ContractDocumentRow>(
      `SELECT * FROM contract_documents WHERE id = $1`,
      [req.params.documentId],
    );
    const document = rows[0];
    if (!document) return res.status(404).json({ error: 'Documento não encontrado' });
    if (document.validation_token && token !== document.validation_token) {
      return res.status(403).json({ error: 'Token de validação inválido' });
    }

    let originalBuffer: Buffer | undefined;
    if (document.original_pdf_path) {
      try {
        originalBuffer = await readPdf(document.original_pdf_path, { pool: deps.pool });
      } catch {
        /* optional */
      }
    }

    const payload = await buildValidityReportPayload({
      pool: deps.pool,
      document,
      appUrl: deps.config.appUrl,
      originalPdfBuffer: originalBuffer,
    });

    return res.json(payload);
  });

  router.get('/:documentId/signed.pdf', async (req: Request, res: Response) => {
    const buf = await readSignedPdfForDocument(deps.pool, req.params.documentId);
    if (!buf) return res.status(404).end();
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(buf);
  });

  return router;
}

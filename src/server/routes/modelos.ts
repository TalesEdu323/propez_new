import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import { serializeModelo, serializeModeloSummary } from '../db/serializers.js'
import { toJsonbParam } from '../db/jsonbParam.js'
import { fetchOrgBrand, mergePageLayoutWithOrgBrand } from '../services/orgBrandDefaults.js'
import { modeloBodySchema, modeloPatchSchema } from '../validation/modeloPayload.js'
import { captureHandledErrorDetail } from '../services/apiErrorTracking.js'
import { MODELO_MAX_PAYLOAD_BYTES, modeloErrorResponse } from './modeloErrors.js'
import {
  assertModeloJsonFields,
  validateModeloReferences,
} from './modeloPersistHelpers.js'

const MODEL_SELECT = `id, nome, elementos, page_layout, servicos, contrato_id, contrato_texto,
              chave_pix, link_pagamento, whatsapp_comprovante, tier, fluxo, signature_config, created_at`

const MODEL_SUMMARY_SELECT = `id, nome, servicos, contrato_id, chave_pix, link_pagamento,
              whatsapp_comprovante, tier, fluxo, created_at`

const MAX_PAYLOAD_BYTES = MODELO_MAX_PAYLOAD_BYTES

const bodySchema = modeloBodySchema
const patchSchema = modeloPatchSchema

function resolveContratoTextoForPersist(
  contratoId: string | null | undefined,
  contratoTexto: string | null | undefined,
): string | null {
  if (contratoId) return null
  return contratoTexto ?? null
}

function pageLayoutHasBranding(pageLayout: Record<string, unknown> | undefined): boolean {
  if (!pageLayout) return false
  return Boolean(pageLayout.logoUrl || pageLayout.primaryColor || pageLayout.secondaryColor)
}

async function resolvePageLayoutForPersist(
  pool: Pool,
  orgId: string,
  pageLayout: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>> {
  const base = pageLayout ?? { widthMode: 'boxed', horizontalPadding: 60 }
  if (pageLayoutHasBranding(pageLayout)) {
    return base
  }
  const orgBrand = await fetchOrgBrand(pool, orgId)
  return mergePageLayoutWithOrgBrand(base, orgBrand)
}

function logModeloPostMetrics(params: {
  orgId: string
  durationMs: number
  elementosBytes: number
  contratoTextoBytes: number
  idempotent: boolean
}): void {
  console.log('[modelos] POST', JSON.stringify(params))
}

function logModeloPgError(
  context: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  const pg = err as { code?: string; column?: string; constraint?: string; detail?: string; message?: string }
  const suffix = extra ? ` ${JSON.stringify(extra)}` : ''
  console.error(
    `[modelos/${context}] pg code=${pg.code ?? '-'} column=${pg.column ?? '-'} constraint=${pg.constraint ?? '-'} detail=${pg.detail ?? pg.message ?? '-'}${suffix}`,
  )
}

function payloadByteLength(raw: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(raw ?? {}), 'utf8')
  } catch {
    return 0
  }
}

export function createModelosRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
}): Router {
  const { pool, config } = deps
  const router = express.Router()
  router.use(buildRequireAuth(config.auth))

  router.get('/summary', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT ${MODEL_SUMMARY_SELECT}
       FROM modelos_propostas
       WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.auth.orgId],
    )
    return res.json(rows.map(serializeModeloSummary))
  })

  router.get('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const summary = req.query.fields === 'summary'
    const select = summary ? MODEL_SUMMARY_SELECT : MODEL_SELECT
    const mapper = summary ? serializeModeloSummary : serializeModelo
    const { rows } = await pool.query(
      `SELECT ${select}
       FROM modelos_propostas
       WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.auth.orgId],
    )
    return res.json(rows.map(mapper))
  })

  router.get('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT ${MODEL_SELECT}
       FROM modelos_propostas
       WHERE organization_id = $1 AND id = $2`,
      [req.auth.orgId, req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Modelo não encontrado' })
    return res.json(serializeModelo(rows[0]))
  })

  router.post('/', async (req: Request, res: Response) => {
    const t0 = Date.now()
    if (!req.auth) return res.status(401).end()

    try {
      const rawBody = req.body ?? {}
      const payloadBytes = payloadByteLength(rawBody)
      if (payloadBytes > MAX_PAYLOAD_BYTES) {
        return res.status(413).json({
          error: 'Payload muito grande. Reduza o conteúdo do modelo ou use um template de contrato em vez de texto inline.',
        })
      }

      let parsed: ReturnType<typeof bodySchema.safeParse>
      try {
        parsed = bodySchema.safeParse(rawBody)
      } catch (err) {
        console.warn('[modelos/POST] validação lançou exceção', err)
        return res.status(400).json({ error: 'Dados do modelo em formato inválido.' })
      }
      if (!parsed.success) {
        console.warn('[modelos/POST] payload inválido', {
          orgId: req.auth.orgId,
          details: parsed.error.flatten(),
        })
        return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
      }
      const d = parsed.data

      const contratoTexto = resolveContratoTextoForPersist(d.contratoId, d.contratoTexto)
      const pageLayout = await resolvePageLayoutForPersist(
        pool,
        req.auth.orgId,
        d.pageLayout as Record<string, unknown> | undefined,
      )
      const elementosValue = d.elementos ?? []
      const fluxoValue = d.fluxo ?? { steps: ['approve', 'sign', 'pay'] as const }
      const contratoTextoBytes = contratoTexto ? Buffer.byteLength(contratoTexto, 'utf8') : 0

      await validateModeloReferences(pool, req.auth.orgId, d.contratoId, d.servicos)
      assertModeloJsonFields({
        elementos: elementosValue,
        pageLayout,
        fluxo: fluxoValue,
        signatureConfig: d.signatureConfig,
      })

      const insertParams = [
        d.nome,
        toJsonbParam(elementosValue, 'elementos'),
        toJsonbParam(pageLayout, 'pageLayout'),
        d.servicos,
        d.contratoId ?? null,
        contratoTexto,
        d.chavePix ?? null,
        d.linkPagamento ?? null,
        d.whatsappComprovante ?? null,
        d.tier,
        toJsonbParam(fluxoValue, 'fluxo'),
        d.signatureConfig != null ? toJsonbParam(d.signatureConfig, 'signatureConfig') : null,
      ]

      let rows: Record<string, unknown>[]

      if (d.id) {
        const { rows: upsertRows } = await pool.query(
          `INSERT INTO modelos_propostas
             (id, organization_id, nome, elementos, page_layout, servicos, contrato_id, contrato_texto,
              chave_pix, link_pagamento, whatsapp_comprovante, tier, fluxo, signature_config)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::uuid[], $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)
           ON CONFLICT (id) DO UPDATE SET
             nome = EXCLUDED.nome,
             elementos = EXCLUDED.elementos,
             page_layout = EXCLUDED.page_layout,
             servicos = EXCLUDED.servicos,
             contrato_id = EXCLUDED.contrato_id,
             contrato_texto = EXCLUDED.contrato_texto,
             chave_pix = EXCLUDED.chave_pix,
             link_pagamento = EXCLUDED.link_pagamento,
             whatsapp_comprovante = EXCLUDED.whatsapp_comprovante,
             tier = EXCLUDED.tier,
             fluxo = EXCLUDED.fluxo,
             signature_config = EXCLUDED.signature_config
           WHERE modelos_propostas.organization_id = EXCLUDED.organization_id
           RETURNING ${MODEL_SUMMARY_SELECT}`,
          [d.id, req.auth.orgId, ...insertParams],
        )
        if (!upsertRows[0]) {
          return res.status(409).json({ error: 'ID de modelo já existe em outra organização' })
        }
        rows = upsertRows
      } else {
        const { rows: insertRows } = await pool.query(
          `INSERT INTO modelos_propostas
             (organization_id, nome, elementos, page_layout, servicos, contrato_id, contrato_texto,
              chave_pix, link_pagamento, whatsapp_comprovante, tier, fluxo, signature_config)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::uuid[], $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb)
           RETURNING ${MODEL_SUMMARY_SELECT}`,
          [req.auth.orgId, ...insertParams],
        )
        rows = insertRows
      }

      logModeloPostMetrics({
        orgId: req.auth.orgId,
        durationMs: Date.now() - t0,
        elementosBytes: payloadByteLength(elementosValue),
        contratoTextoBytes,
        idempotent: Boolean(d.id),
      })

      return res.status(201).json(serializeModeloSummary(rows[0]))
    } catch (err) {
      captureHandledErrorDetail(err, res, {
        payloadBytes: payloadByteLength(req.body ?? {}),
        idempotent: Boolean((req.body as { id?: string })?.id),
      })
      logModeloPgError('POST', err, { orgId: req.auth.orgId })
      const { status, error } = modeloErrorResponse(err)
      return res.status(status).json({ error })
    }
  })

  router.patch('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()

    let patchJsonbFields: Record<string, unknown> | undefined

    try {
      const rawBody = req.body ?? {}
      const payloadBytes = payloadByteLength(rawBody)
      if (payloadBytes > MAX_PAYLOAD_BYTES) {
        return res.status(413).json({
          error: 'Payload muito grande. Reduza o conteúdo do modelo ou use um template de contrato em vez de texto inline.',
        })
      }

      let parsed: ReturnType<typeof patchSchema.safeParse>
      try {
        parsed = patchSchema.safeParse(rawBody)
      } catch (err) {
        console.warn('[modelos/PATCH] validação lançou exceção', err)
        return res.status(400).json({ error: 'Dados do modelo em formato inválido.' })
      }
      if (!parsed.success) {
        console.warn('[modelos/PATCH] payload inválido', {
          modeloId: req.params.id,
          orgId: req.auth.orgId,
          details: parsed.error.flatten(),
        })
        return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
      }
      const d = parsed.data

      let patchContratoTexto: string | null | undefined
      if ('contratoId' in d || 'contratoTexto' in d) {
        let effectiveContratoId = 'contratoId' in d ? (d.contratoId ?? null) : undefined
        if (effectiveContratoId === undefined) {
          const { rows: existingRows } = await pool.query<{ contrato_id: string | null }>(
            `SELECT contrato_id FROM modelos_propostas WHERE organization_id = $1 AND id = $2`,
            [req.auth.orgId, req.params.id],
          )
          effectiveContratoId = existingRows[0]?.contrato_id ?? null
        }
        patchContratoTexto = resolveContratoTextoForPersist(
          effectiveContratoId,
          'contratoTexto' in d ? d.contratoTexto : null,
        )
      }

      const patchPageLayout =
        d.pageLayout !== undefined
          ? await resolvePageLayoutForPersist(
              pool,
              req.auth.orgId,
              d.pageLayout as Record<string, unknown> | undefined,
            )
          : undefined

      const patchJsonbContext = {
        modeloId: req.params.id,
        orgId: req.auth.orgId,
        hasElementos: d.elementos !== undefined,
        hasPageLayout: d.pageLayout !== undefined,
        hasFluxo: d.fluxo !== undefined,
        hasSignatureConfig: d.signatureConfig !== undefined,
        elementosBytes: d.elementos !== undefined ? payloadByteLength(d.elementos) : 0,
        pageLayoutBytes: patchPageLayout !== undefined ? payloadByteLength(patchPageLayout) : 0,
      }
      patchJsonbFields = patchJsonbContext
      console.log('[modelos/PATCH] fields', JSON.stringify(patchJsonbContext))

      const effectiveServicos = d.servicos ?? []
      const effectiveContratoId =
        'contratoId' in d ? (d.contratoId ?? null) : undefined
      if (d.servicos !== undefined || effectiveContratoId !== undefined) {
        let contratoForValidation = effectiveContratoId
        if (contratoForValidation === undefined) {
          const { rows: existingRows } = await pool.query<{ contrato_id: string | null }>(
            `SELECT contrato_id FROM modelos_propostas WHERE organization_id = $1 AND id = $2`,
            [req.auth.orgId, req.params.id],
          )
          contratoForValidation = existingRows[0]?.contrato_id ?? null
        }
        await validateModeloReferences(
          pool,
          req.auth.orgId,
          contratoForValidation,
          d.servicos !== undefined ? effectiveServicos : [],
        )
      }

      if (
        d.elementos !== undefined ||
        patchPageLayout !== undefined ||
        d.fluxo !== undefined ||
        d.signatureConfig !== undefined
      ) {
        assertModeloJsonFields({
          elementos: d.elementos ?? [],
          pageLayout: patchPageLayout ?? {},
          fluxo: d.fluxo ?? { steps: ['approve', 'sign', 'pay'] },
          signatureConfig: d.signatureConfig,
        })
      }

      const { rows } = await pool.query(
        `UPDATE modelos_propostas SET
           nome = COALESCE($3, nome),
           elementos = CASE WHEN $4::boolean THEN $5::jsonb ELSE elementos END,
           page_layout = CASE WHEN $6::boolean THEN $7::jsonb ELSE page_layout END,
           servicos = CASE WHEN $8::boolean THEN $9::uuid[] ELSE servicos END,
           contrato_id = CASE WHEN $10::boolean THEN $11 ELSE contrato_id END,
           contrato_texto = CASE WHEN $12::boolean THEN $13 ELSE contrato_texto END,
           chave_pix = CASE WHEN $14::boolean THEN $15 ELSE chave_pix END,
           link_pagamento = CASE WHEN $16::boolean THEN $17 ELSE link_pagamento END,
           whatsapp_comprovante = CASE WHEN $18::boolean THEN $19 ELSE whatsapp_comprovante END,
           tier = COALESCE($20, tier),
           fluxo = CASE WHEN $21::boolean THEN $22::jsonb ELSE fluxo END,
           signature_config = CASE WHEN $23::boolean THEN $24::jsonb ELSE signature_config END
         WHERE organization_id = $1 AND id = $2
         RETURNING ${MODEL_SELECT}`,
        [
          req.auth.orgId,
          req.params.id,
          d.nome ?? null,
          d.elementos !== undefined,
          d.elementos !== undefined ? toJsonbParam(d.elementos, 'elementos') : null,
          d.pageLayout !== undefined,
          patchPageLayout !== undefined ? toJsonbParam(patchPageLayout, 'pageLayout') : null,
          d.servicos !== undefined,
          d.servicos ?? null,
          'contratoId' in d,
          d.contratoId ?? null,
          patchContratoTexto !== undefined,
          patchContratoTexto ?? null,
          'chavePix' in d,
          d.chavePix ?? null,
          'linkPagamento' in d,
          d.linkPagamento ?? null,
          'whatsappComprovante' in d,
          d.whatsappComprovante ?? null,
          d.tier ?? null,
          d.fluxo !== undefined,
          d.fluxo !== undefined ? toJsonbParam(d.fluxo, 'fluxo') : null,
          d.signatureConfig !== undefined,
          d.signatureConfig !== undefined ? toJsonbParam(d.signatureConfig, 'signatureConfig') : null,
        ],
      )
      if (!rows[0]) return res.status(404).json({ error: 'Modelo não encontrado' })
      return res.json(serializeModelo(rows[0]))
    } catch (err) {
      const pg = err as { code?: string }
      captureHandledErrorDetail(err, res, {
        modeloId: req.params.id,
        ...(pg.code === '22P02' ? patchJsonbFields : {}),
      })
      logModeloPgError('PATCH', err, pg.code === '22P02' ? patchJsonbFields : { orgId: req.auth.orgId })
      const { status, error } = modeloErrorResponse(err)
      return res.status(status).json({ error })
    }
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rowCount } = await pool.query(
      `DELETE FROM modelos_propostas WHERE organization_id = $1 AND id = $2`,
      [req.auth.orgId, req.params.id],
    )
    if (!rowCount) return res.status(404).json({ error: 'Modelo não encontrado' })
    return res.json({ ok: true })
  })

  return router
}

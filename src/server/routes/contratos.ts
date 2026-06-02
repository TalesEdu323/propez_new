import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import multer from 'multer'
import { PDFDocument } from 'pdf-lib'
import { z } from 'zod'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import { serializeContrato } from '../db/serializers.js'
import { generateContractPdf } from '../services/contractPdf.js'
import { resolveOrgSignatureDataUri } from '../services/signing/orgSignatureAsset.js'
import {
  hasSignerSignatureField,
  normalizeSignatureConfig,
  validateTemplateSignatureConfig,
} from '../../lib/signatureConfig.js'
import { isPdfBuffer } from '../../lib/pdfPreview.js'
import {
  deleteTemplatePdf,
  readTemplatePdf,
  uploadPdfErrorMessage,
  writeTemplatePdf,
  type TemplatePdfRef,
} from '../services/contractTemplateStorage.js'

const CONTRATO_SELECT = `id, titulo, texto, source_type, pdf_path, pdf_file_name, page_count, signature_config, created_at`

const marcadorSchema = z.object({
  id: z.string().min(1),
  signerId: z.string().min(1),
  type: z.enum(['signature', 'initials', 'text']),
  page: z.number().int().min(1).max(500),
  xPct: z.number().min(0).max(1),
  yPct: z.number().min(0).max(1),
  widthPct: z.number().min(0.01).max(1),
  heightPct: z.number().min(0.01).max(1),
  rotation: z.number().optional(),
  groupId: z.string().optional(),
  content: z.string().max(2000).optional(),
  fontKey: z.enum(['aletheia', 'authentic']).optional(),
})

const signatureConfigV2Schema = z.object({
  version: z.literal(2),
  signers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.enum(['client', 'org']),
    }),
  ),
  fields: z.array(marcadorSchema).min(1),
})

const signatureFieldLegacySchema = z.object({
  page: z.number().int().min(1).max(500),
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  widthPct: z.number().min(1).max(100),
  heightPct: z.number().min(1).max(100),
})

const signatureConfigSchema = z.union([
  signatureConfigV2Schema,
  z.object({ clientField: signatureFieldLegacySchema }),
])

const bodySchema = z.object({
  titulo: z.string().trim().min(1).max(200),
  texto: z.string().max(200_000).default(''),
  sourceType: z.enum(['text', 'pdf']).optional(),
})

const patchSchema = bodySchema.partial().extend({
  signatureConfig: signatureConfigSchema.nullable().optional(),
  sourceType: z.enum(['text', 'pdf']).optional(),
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Apenas arquivos PDF são permitidos'))
  },
})

function templatePdfRef(orgId: string, contratoId: string, pdfPath?: string | null): TemplatePdfRef {
  return { pool, orgId, contratoId, pdfPath: pdfPath ?? null }
}

async function loadContratoRow(pool: Pool, orgId: string, id: string) {
  const { rows } = await pool.query(
    `SELECT ${CONTRATO_SELECT} FROM contratos_templates WHERE organization_id = $1 AND id = $2`,
    [orgId, id],
  )
  return rows[0] ?? null
}

async function getOrgContext(pool: Pool, orgId: string) {
  const { rows } = await pool.query<{ name: string; cnpj: string | null; signature_url: string | null }>(
    `SELECT name, cnpj, signature_url FROM organizations WHERE id = $1`,
    [orgId],
  )
  const org = rows[0]
  const orgSignature = await resolveOrgSignatureDataUri({
    signatureUrl: org?.signature_url,
    orgName: org?.name || 'Organização',
  })
  return { org, orgSignature }
}

export function createContratosRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
}): Router {
  const { pool, config } = deps
  const router = express.Router()
  router.use(buildRequireAuth(config.auth))

  router.get('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT ${CONTRATO_SELECT} FROM contratos_templates
       WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.auth.orgId],
    )
    return res.json(rows.map(serializeContrato))
  })

  router.get('/:id/preview-pdf', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const row = await loadContratoRow(pool, req.auth.orgId, req.params.id)
    if (!row) return res.status(404).json({ error: 'Contrato não encontrado' })

    try {
      if (row.source_type === 'pdf') {
        const buf = await readTemplatePdf(
          templatePdfRef(req.auth.orgId, req.params.id, row.pdf_path),
        )
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'inline; filename="contrato-preview.pdf"')
        return res.send(buf)
      }

      const { org, orgSignature } = await getOrgContext(pool, req.auth.orgId)
      const pdf = await generateContractPdf({
        title: row.titulo || 'Contrato de Prestação de Serviços',
        body: row.texto || '',
        clientName: 'Cliente Exemplo',
        companyName: org?.name || undefined,
        companyCnpj: org?.cnpj ?? undefined,
        orgSignatureDataUri: orgSignature,
      })
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'inline; filename="contrato-preview.pdf"')
      return res.send(pdf)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[contratos/preview-pdf] erro:', err)
      if (/não encontrado/i.test(msg)) {
        return res.status(404).json({
          error: 'PDF não encontrado. Envie o arquivo novamente na etapa de conteúdo.',
        })
      }
      return res.status(500).json({ error: 'Erro ao gerar preview do contrato' })
    }
  })

  router.get('/:id/pdf', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const row = await loadContratoRow(pool, req.auth.orgId, req.params.id)
    if (!row || row.source_type !== 'pdf') {
      return res.status(404).json({ error: 'PDF não encontrado' })
    }
    try {
      const buf = await readTemplatePdf(
        templatePdfRef(req.auth.orgId, req.params.id, row.pdf_path),
      )
      const name = row.pdf_file_name || 'contrato.pdf'
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="${name}"`)
      return res.send(buf)
    } catch {
      return res.status(404).json({ error: 'Arquivo PDF não encontrado' })
    }
  })

  router.get('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const row = await loadContratoRow(pool, req.auth.orgId, req.params.id)
    if (!row) return res.status(404).json({ error: 'Contrato não encontrado' })
    return res.json(serializeContrato(row))
  })

  router.post('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    const d = parsed.data
    const sourceType = d.sourceType ?? 'text'
    const { rows } = await pool.query(
      `INSERT INTO contratos_templates (organization_id, titulo, texto, source_type)
       VALUES ($1, $2, $3, $4)
       RETURNING ${CONTRATO_SELECT}`,
      [req.auth.orgId, d.titulo, d.texto, sourceType],
    )
    return res.status(201).json(serializeContrato(rows[0]))
  })

  router.post('/:id/upload-pdf', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const file = req.file
    if (!file?.buffer?.length) {
      return res.status(400).json({ error: 'Envie um arquivo PDF no campo "file"' })
    }

    const row = await loadContratoRow(pool, req.auth.orgId, req.params.id)
    if (!row) return res.status(404).json({ error: 'Contrato não encontrado' })

    try {
      if (!isPdfBuffer(file.buffer)) {
        return res.status(400).json({ error: 'O arquivo enviado não é um PDF válido.' })
      }

      let pageCount = 1
      try {
        const pdfDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true })
        pageCount = pdfDoc.getPageCount()
        if (pageCount === 0) return res.status(400).json({ error: 'PDF vazio' })
      } catch (parseErr) {
        console.warn('[contratos/upload-pdf] pdf-lib não leu o arquivo; usando contagem padrão:', parseErr)
      }

      const pdfPath = await writeTemplatePdf(pool, req.auth.orgId, req.params.id, file.buffer)
      const safeName = (file.originalname || 'contrato.pdf').replace(/[^\w\s.-]/g, '').slice(0, 120) || 'contrato.pdf'

      const { rows: updated } = await pool.query(
        `UPDATE contratos_templates SET
           source_type = 'pdf',
           pdf_path = $3,
           pdf_file_name = $4,
           page_count = $5,
           texto = ''
         WHERE organization_id = $1 AND id = $2
         RETURNING ${CONTRATO_SELECT}`,
        [req.auth.orgId, req.params.id, pdfPath, safeName, pageCount],
      )
      return res.json({ ...serializeContrato(updated[0]), pageCount })
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
      console.error('[contratos/upload-pdf] erro:', { code, err })
      return res.status(400).json({ error: uploadPdfErrorMessage(err) })
    }
  })

  router.patch('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    const d = parsed.data

    const existing = await loadContratoRow(pool, req.auth.orgId, req.params.id)
    if (!existing) return res.status(404).json({ error: 'Contrato não encontrado' })

    if (d.signatureConfig != null) {
      const { org } = await getOrgContext(pool, req.auth.orgId)
      const norm = normalizeSignatureConfig(
        d.signatureConfig,
        org?.name || 'Empresa',
        existing.page_count ?? 1,
      )
      const err = validateTemplateSignatureConfig(norm)
      if (err) return res.status(400).json({ error: err })
      if (!hasSignerSignatureField(norm, 'client') || !hasSignerSignatureField(norm, 'org')) {
        return res.status(400).json({
          error: 'Configure marcadores de assinatura para Cliente e Empresa.',
        })
      }
    }

    if (d.sourceType === 'text' && existing.source_type === 'pdf') {
      await deleteTemplatePdf(
        templatePdfRef(req.auth.orgId, req.params.id, existing.pdf_path),
        existing.pdf_path,
      )
    }

    const { rows } = await pool.query(
      `UPDATE contratos_templates SET
         titulo = COALESCE($3, titulo),
         texto = CASE WHEN $4::boolean THEN $5 ELSE texto END,
         source_type = COALESCE($6, source_type),
         signature_config = CASE WHEN $7::boolean THEN $8::jsonb ELSE signature_config END,
         pdf_path = CASE WHEN $9::boolean THEN NULL ELSE pdf_path END,
         pdf_file_name = CASE WHEN $9::boolean THEN NULL ELSE pdf_file_name END,
         page_count = CASE WHEN $9::boolean THEN NULL ELSE page_count END,
         pdf_data = CASE WHEN $9::boolean THEN NULL ELSE pdf_data END
       WHERE organization_id = $1 AND id = $2
       RETURNING ${CONTRATO_SELECT}`,
      [
        req.auth.orgId,
        req.params.id,
        d.titulo ?? null,
        'texto' in d,
        d.texto ?? null,
        d.sourceType ?? null,
        d.signatureConfig !== undefined,
        d.signatureConfig != null ? JSON.stringify(d.signatureConfig) : null,
        d.sourceType === 'text',
      ],
    )
    return res.json(serializeContrato(rows[0]))
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const row = await loadContratoRow(pool, req.auth.orgId, req.params.id)
    if (!row) return res.status(404).json({ error: 'Contrato não encontrado' })
    if (row.pdf_path || row.source_type === 'pdf') {
      await deleteTemplatePdf(
        templatePdfRef(req.auth.orgId, req.params.id, row.pdf_path),
        row.pdf_path,
      )
    }
    await pool.query(`DELETE FROM contratos_templates WHERE organization_id = $1 AND id = $2`, [
      req.auth.orgId,
      req.params.id,
    ])
    return res.json({ ok: true })
  })

  return router
}

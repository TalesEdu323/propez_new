import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import { z } from 'zod'
import { serializeProposta } from '../db/serializers.js'

const PROPOSTA_SELECT = `
  id, cliente_id, cliente_nome, modelo_id, servicos,
  valor_cents, desconto_cents, recorrente, ciclo_recorrencia, duracao_recorrencia,
  data_envio, data_validade, status, elementos, contrato_texto, contrato_id,
  chave_pix, link_pagamento, pago, data_pagamento, creator_plan, public_token,
  prosync_lead_id, rubrica_document_id, rubrica_status, rubrica_signing_url,
  rubrica_signed_pdf_url, rubrica_last_sync_at, created_at
`

const approveSchema = z.object({
  action: z.enum(['approve', 'reject']),
  clientName: z.string().trim().max(200).optional(),
  clientDocument: z.string().trim().max(50).optional(),
  clientEmail: z.string().trim().max(200).optional(),
})

/**
 * Endpoints públicos (sem autenticação) para o cliente final visualizar e
 * aprovar a proposta via `/p/{token}`.
 */
export function createPublicPropostasRouter(deps: { pool: Pool }): Router {
  const { pool } = deps
  const router = express.Router()

  router.get('/:token', async (req: Request, res: Response) => {
    const token = String(req.params.token || '').trim()
    if (!token) return res.status(400).json({ error: 'Token obrigatório' })
    try {
      const { rows } = await pool.query(
        `SELECT p.organization_id, o.name AS org_name, o.logo_url, o.signature_url, o.cnpj, o.plan,
                ${PROPOSTA_SELECT.split(',').map((c) => `p.${c.trim()}`).join(', ')}
         FROM propostas p
         JOIN organizations o ON o.id = p.organization_id
         WHERE p.public_token = $1`,
        [token],
      )
      if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' })
      const r = rows[0]
      return res.json({
        proposta: serializeProposta(r),
        organization: {
          id: r.organization_id,
          name: r.org_name,
          cnpj: r.cnpj,
          logoUrl: r.logo_url,
          signatureUrl: r.signature_url,
          plan: r.plan,
        },
      })
    } catch (err) {
      console.error('[public/proposta] erro:', err)
      return res.status(500).json({ error: 'Erro ao carregar proposta' })
    }
  })

  router.post('/:token/decision', async (req: Request, res: Response) => {
    const token = String(req.params.token || '').trim()
    if (!token) return res.status(400).json({ error: 'Token obrigatório' })
    const parsed = approveSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    const { action, clientName } = parsed.data

    try {
      const status = action === 'approve' ? 'aprovada' : 'recusada'
      const { rows } = await pool.query(
        `UPDATE propostas SET status = $2, cliente_nome = COALESCE($3, cliente_nome), data_envio = COALESCE(data_envio, NOW())
         WHERE public_token = $1
         RETURNING ${PROPOSTA_SELECT}, organization_id`,
        [token, status, clientName ?? null],
      )
      if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' })
      return res.json(serializeProposta(rows[0]))
    } catch (err) {
      console.error('[public/decision] erro:', err)
      return res.status(500).json({ error: 'Erro ao registrar decisão' })
    }
  })

  return router
}

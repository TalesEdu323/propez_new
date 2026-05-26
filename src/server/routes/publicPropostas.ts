import express from 'express'

import type { Request, Response, Router } from 'express'

import type { Pool } from 'pg'

import { z } from 'zod'

import { serializeProposta } from '../db/serializers.js'

import type { SuiteProposalEventsClient } from '../clients/suiteProposalEvents.js'

import type { EnvironmentConfig } from '../env.js'

import type { MailClient } from '../mail/client.js'

import { notifyProposalEventAsync } from '../services/notificationService.js'



const PROPOSTA_SELECT = `

  id, cliente_id, cliente_nome, cliente_email, modelo_id, servicos,

  valor_cents, desconto_cents, recorrente, ciclo_recorrencia, duracao_recorrencia,

  data_envio, data_validade, status, elementos, contrato_texto, contrato_id,

  chave_pix, link_pagamento, pago, data_pagamento, creator_plan, public_token,

  prosync_lead_id, rubrica_document_id, rubrica_status, rubrica_signing_url,

  rubrica_signed_pdf_url, rubrica_last_sync_at, viewed_at, created_at

`



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

})



/**

 * Endpoints públicos (sem autenticação) para o cliente final visualizar e

 * aprovar a proposta via `/p/{token}`.

 */

export function createPublicPropostasRouter(deps: {

  pool: Pool

  mail: MailClient

  suiteProposalEvents?: SuiteProposalEventsClient

  config?: EnvironmentConfig

}): Router {

  const { pool, mail, suiteProposalEvents, config } = deps

  const router = express.Router()



  router.get('/:token', async (req: Request, res: Response) => {

    const token = String(req.params.token || '').trim()

    if (!token) return res.status(400).json({ error: 'Token obrigatório' })

    try {

      const { rows } = await pool.query(

        `SELECT p.organization_id, o.name AS org_name, o.logo_url, o.signature_url, o.cnpj, o.plan,

                p.viewed_at,

                ${PROPOSTA_SELECT.split(',').map((c) => `p.${c.trim()}`).join(', ')}

         FROM propostas p

         JOIN organizations o ON o.id = p.organization_id

         WHERE p.public_token = $1`,

        [token],

      )

      if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' })

      const r = rows[0]



      if (!r.viewed_at && config) {

        await pool.query(

          `UPDATE propostas SET viewed_at = NOW() WHERE public_token = $1 AND viewed_at IS NULL`,

          [token],

        )

        notifyProposalEventAsync({

          pool,

          mail,

          config,

          proposalId: String(r.id),

          type: 'proposal_viewed',

        })

      }



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

    if (!parsed.success) {

      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })

    }

    const { action, clientName, clientEmail } = parsed.data



    try {

      const status = action === 'approve' ? 'aprovada' : 'recusada'

      const current = await pool.query<{ status: 'pendente' | 'aprovada' | 'recusada' }>(

        `SELECT status FROM propostas WHERE public_token = $1`,

        [token],

      )

      if (!current.rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' })

      if (current.rows[0].status !== 'pendente') {

        return res.status(409).json({ error: 'Decisão já registrada para esta proposta' })

      }



      const emailNorm = clientEmail?.trim().toLowerCase() ?? null



      const { rows } = await pool.query(

        `UPDATE propostas SET

           status = $2,

           cliente_nome = COALESCE($3, cliente_nome),

           cliente_email = COALESCE(NULLIF($4, ''), cliente_email),

           data_envio = COALESCE(data_envio, NOW())

         WHERE public_token = $1

         RETURNING ${PROPOSTA_SELECT}, organization_id`,

        [token, status, clientName ?? null, emailNorm],

      )

      if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' })

      const updated = rows[0]



      if (suiteProposalEvents?.isEnabled() && updated.prosync_lead_id && config) {

        const valor = typeof updated.valor_cents === 'number' ? updated.valor_cents : null

        const desconto =

          typeof updated.desconto_cents === 'number' ? updated.desconto_cents : 0

        const finalValueCents = valor != null ? Math.max(0, valor - desconto) : null

        const baseUrl = config.appUrl.replace(/\/+$/, '')

        const publicUrl = updated.public_token ? `${baseUrl}/p/${updated.public_token}` : null

        suiteProposalEvents.fireAndForget({

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

        })

      }



      if (config) {

        notifyProposalEventAsync({

          pool,

          mail,

          config,

          proposalId: String(updated.id),

          type: status === 'aprovada' ? 'proposal_approved' : 'proposal_rejected',

        })

      }



      return res.json(serializeProposta(updated))

    } catch (err) {

      console.error('[public/decision] erro:', err)

      return res.status(500).json({ error: 'Erro ao registrar decisão' })

    }

  })



  return router

}



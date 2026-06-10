/**
 * Conversão de rows do Postgres para os shapes usados pelo frontend.
 * Mantemos as chaves dos types históricos em `src/lib/store.ts` para
 * facilitar a migração (cliente_nome, data_criacao, etc.).
 */

import { parseProposalFlow, type ProposalFlowConfig } from '../../types/proposalFlow.js';
import { normalizePageLayout } from '../../lib/pageLayout.js';
import type { BuilderPageLayout } from '../../types/builder.js';

export interface SerializedCliente {
  id: string
  nome: string
  empresa: string
  email: string
  telefone: string
  data_cadastro: string
}

export interface SerializedServico {
  id: string
  nome: string
  descricao: string
  valor: number
  tipo: 'unico' | 'recorrente'
  contratoId?: string
  elementos: unknown[]
}

export interface SerializedContrato {
  id: string
  titulo: string
  texto: string
  sourceType: 'text' | 'pdf'
  pdfPath?: string
  pdfFileName?: string
  pageCount?: number
  signatureConfig?: unknown
  data_criacao: string
}

export interface SerializedModelo {
  id: string
  nome: string
  elementos: unknown[]
  pageLayout: BuilderPageLayout
  servicos: string[]
  contratoId?: string
  contratoTexto?: string
  chavePix?: string
  linkPagamento?: string
  whatsappComprovante?: string
  tier: 'free' | 'pro' | 'business'
  fluxo: ProposalFlowConfig
  signatureConfig?: unknown
  data_criacao: string
}

export interface SerializedProposta {
  id: string
  cliente_id: string | null
  cliente_nome: string
  clienteEmail?: string | null
  modelo_id?: string | null
  servicos: string[]
  valor: number
  desconto?: number
  recorrente?: boolean
  ciclo_recorrencia?: string | null
  duracao_recorrencia?: number | null
  data_envio?: string | null
  data_validade?: string | null
  status: 'pendente' | 'aprovada' | 'recusada'
  elementos: unknown[]
  pageLayout: BuilderPageLayout
  contratoTexto?: string | null
  contratoId?: string | null
  chavePix?: string | null
  linkPagamento?: string | null
  pago: boolean
  data_pagamento?: string | null
  data_criacao: string
  creatorPlan?: string | null
  publicToken?: string | null
  prosyncLeadId?: string | null
  contractSignDocumentId?: string | null
  contractSignStatus?: string | null
  contractSigningUrl?: string | null
  contractSignedPdfPath?: string | null
  contractSignLastSyncAt?: string | null
  fluxo: ProposalFlowConfig
  clienteContratoRecebidoAt?: string | null
  orgContratoAceitoAt?: string | null
  contratoConcluidoAt?: string | null
}

type AnyRow = Record<string, any>

function toArrayOfString(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x))
  return []
}

export function serializeCliente(r: AnyRow): SerializedCliente {
  return {
    id: r.id,
    nome: r.nome,
    empresa: r.empresa ?? '',
    email: r.email ?? '',
    telefone: r.telefone ?? '',
    data_cadastro: r.created_at,
  }
}

export function serializeServico(r: AnyRow): SerializedServico {
  return {
    id: r.id,
    nome: r.nome,
    descricao: r.descricao ?? '',
    valor: Number(r.valor_cents ?? 0) / 100,
    tipo: (r.tipo ?? 'unico') as 'unico' | 'recorrente',
    contratoId: r.contrato_id ?? undefined,
    elementos: Array.isArray(r.elementos) ? r.elementos : [],
  }
}

export function serializeContrato(r: AnyRow): SerializedContrato {
  return {
    id: r.id,
    titulo: r.titulo,
    texto: r.texto ?? '',
    sourceType: (r.source_type === 'pdf' ? 'pdf' : 'text') as 'text' | 'pdf',
    pdfPath: r.pdf_path ?? undefined,
    pdfFileName: r.pdf_file_name ?? undefined,
    pageCount: r.page_count != null ? Number(r.page_count) : undefined,
    signatureConfig: r.signature_config ?? undefined,
    data_criacao: r.created_at,
  }
}

export function serializeModelo(r: AnyRow): SerializedModelo {
  return {
    id: r.id,
    nome: r.nome,
    elementos: Array.isArray(r.elementos) ? r.elementos : [],
    pageLayout: normalizePageLayout(r.page_layout),
    servicos: toArrayOfString(r.servicos),
    contratoId: r.contrato_id ?? undefined,
    contratoTexto: r.contrato_texto ?? undefined,
    chavePix: r.chave_pix ?? undefined,
    linkPagamento: r.link_pagamento ?? undefined,
    whatsappComprovante: r.whatsapp_comprovante ?? undefined,
    tier: (r.tier ?? 'free') as 'free' | 'pro' | 'business',
    fluxo: parseProposalFlow(r.fluxo),
    signatureConfig: r.signature_config ?? undefined,
    data_criacao: r.created_at,
  }
}

/** Versão leve para listagem (sem elementos, page_layout, contrato_texto, signature_config). */
export function serializeModeloSummary(r: AnyRow): SerializedModelo {
  return serializeModelo({
    ...r,
    elementos: [],
    page_layout: null,
    contrato_texto: null,
    signature_config: null,
  })
}

export function serializeProposta(r: AnyRow): SerializedProposta {
  return {
    id: r.id,
    cliente_id: r.cliente_id,
    cliente_nome: r.cliente_nome ?? '',
    clienteEmail: r.cliente_email?.trim() || undefined,
    modelo_id: r.modelo_id,
    servicos: toArrayOfString(r.servicos),
    valor: Number(r.valor_cents ?? 0) / 100,
    desconto: r.desconto_cents != null ? Number(r.desconto_cents) / 100 : undefined,
    recorrente: !!r.recorrente,
    ciclo_recorrencia: r.ciclo_recorrencia,
    duracao_recorrencia: r.duracao_recorrencia,
    data_envio: r.data_envio,
    data_validade: r.data_validade,
    viewedAt: r.viewed_at ?? undefined,
    status: (r.status ?? 'pendente') as 'pendente' | 'aprovada' | 'recusada',
    elementos: Array.isArray(r.elementos) ? r.elementos : [],
    pageLayout: normalizePageLayout(r.page_layout),
    contratoTexto: r.contrato_texto,
    contratoId: r.contrato_id,
    chavePix: r.chave_pix,
    linkPagamento: r.link_pagamento,
    whatsappComprovante: r.whatsapp_comprovante,
    pago: !!r.pago,
    data_pagamento: r.data_pagamento,
    data_criacao: r.created_at,
    creatorPlan: r.creator_plan,
    publicToken: r.public_token,
    prosyncLeadId: r.prosync_lead_id,
    contractSignDocumentId: r.contract_sign_document_id ?? r.rubrica_document_id ?? undefined,
    contractSignStatus: r.contract_sign_status ?? r.rubrica_status ?? undefined,
    contractSigningUrl: r.contract_signing_url ?? r.rubrica_signing_url ?? undefined,
    contractSignedPdfPath: r.contract_signed_pdf_path ?? r.rubrica_signed_pdf_url ?? undefined,
    contractSignLastSyncAt: r.contract_sign_last_sync_at ?? r.rubrica_last_sync_at ?? undefined,
    fluxo: parseProposalFlow(r.fluxo),
    clienteContratoRecebidoAt: r.cliente_contrato_recebido_at ?? undefined,
    orgContratoAceitoAt: r.org_contrato_aceito_at ?? undefined,
    contratoConcluidoAt: r.contrato_concluido_at ?? undefined,
  }
}

/** Versão leve para listagem (sem elementos/pageLayout/contratoTexto). */
export function serializePropostaSummary(r: AnyRow): SerializedProposta {
  const full = serializeProposta({
    ...r,
    elementos: [],
    page_layout: null,
    contrato_texto: null,
  })
  return full
}

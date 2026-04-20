/**
 * Conversão de rows do Postgres para os shapes usados pelo frontend.
 * Mantemos as chaves dos types históricos em `src/lib/store.ts` para
 * facilitar a migração (cliente_nome, data_criacao, etc.).
 */

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
}

export interface SerializedContrato {
  id: string
  titulo: string
  texto: string
  data_criacao: string
}

export interface SerializedModelo {
  id: string
  nome: string
  elementos: unknown[]
  servicos: string[]
  contratoId?: string
  contratoTexto?: string
  chavePix?: string
  linkPagamento?: string
  tier: 'free' | 'pro' | 'business'
  data_criacao: string
}

export interface SerializedProposta {
  id: string
  cliente_id: string | null
  cliente_nome: string
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
  rubricaDocumentId?: string | null
  rubricaStatus?: string | null
  rubricaSigningUrl?: string | null
  rubricaSignedPdfUrl?: string | null
  rubricaLastSyncAt?: string | null
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
  }
}

export function serializeContrato(r: AnyRow): SerializedContrato {
  return {
    id: r.id,
    titulo: r.titulo,
    texto: r.texto ?? '',
    data_criacao: r.created_at,
  }
}

export function serializeModelo(r: AnyRow): SerializedModelo {
  return {
    id: r.id,
    nome: r.nome,
    elementos: Array.isArray(r.elementos) ? r.elementos : [],
    servicos: toArrayOfString(r.servicos),
    contratoId: r.contrato_id ?? undefined,
    contratoTexto: r.contrato_texto ?? undefined,
    chavePix: r.chave_pix ?? undefined,
    linkPagamento: r.link_pagamento ?? undefined,
    tier: (r.tier ?? 'free') as 'free' | 'pro' | 'business',
    data_criacao: r.created_at,
  }
}

export function serializeProposta(r: AnyRow): SerializedProposta {
  return {
    id: r.id,
    cliente_id: r.cliente_id,
    cliente_nome: r.cliente_nome ?? '',
    modelo_id: r.modelo_id,
    servicos: toArrayOfString(r.servicos),
    valor: Number(r.valor_cents ?? 0) / 100,
    desconto: r.desconto_cents != null ? Number(r.desconto_cents) / 100 : undefined,
    recorrente: !!r.recorrente,
    ciclo_recorrencia: r.ciclo_recorrencia,
    duracao_recorrencia: r.duracao_recorrencia,
    data_envio: r.data_envio,
    data_validade: r.data_validade,
    status: (r.status ?? 'pendente') as 'pendente' | 'aprovada' | 'recusada',
    elementos: Array.isArray(r.elementos) ? r.elementos : [],
    contratoTexto: r.contrato_texto,
    contratoId: r.contrato_id,
    chavePix: r.chave_pix,
    linkPagamento: r.link_pagamento,
    pago: !!r.pago,
    data_pagamento: r.data_pagamento,
    data_criacao: r.created_at,
    creatorPlan: r.creator_plan,
    publicToken: r.public_token,
    prosyncLeadId: r.prosync_lead_id,
    rubricaDocumentId: r.rubrica_document_id,
    rubricaStatus: r.rubrica_status,
    rubricaSigningUrl: r.rubrica_signing_url,
    rubricaSignedPdfUrl: r.rubrica_signed_pdf_url,
    rubricaLastSyncAt: r.rubrica_last_sync_at,
  }
}

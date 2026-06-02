/** Colunas de proposta para SELECT (schema após migration 016). */

export const PROPOSTA_SELECT = `

  id, cliente_id, cliente_nome, cliente_email, cliente_documento, modelo_id, servicos,

  valor_cents, desconto_cents, recorrente, ciclo_recorrencia, duracao_recorrencia,

  data_envio, data_validade, status, elementos, page_layout, contrato_texto, contrato_id,

  chave_pix, link_pagamento, pago, data_pagamento, creator_plan, public_token,

  prosync_lead_id, contract_sign_document_id, contract_sign_status, contract_signing_url,

  contract_signed_pdf_path, contract_sign_last_sync_at,

  viewed_at, created_at,

  fluxo, cliente_contrato_recebido_at, org_contrato_aceito_at, contrato_concluido_at

`.trim();



export const PROPOSTA_FIELDS = PROPOSTA_SELECT.replace(/\s+/g, ' ');



/** Listagem leve para hydrate (sem JSONB pesado). */

export const PROPOSTA_SUMMARY_SELECT = `

  id, cliente_id, cliente_nome, cliente_email, cliente_documento, modelo_id, servicos,

  valor_cents, desconto_cents, recorrente, ciclo_recorrencia, duracao_recorrencia,

  data_envio, data_validade, status, contrato_id,

  chave_pix, link_pagamento, pago, data_pagamento, creator_plan, public_token,

  prosync_lead_id, contract_sign_document_id, contract_sign_status, contract_signing_url,

  contract_signed_pdf_path, contract_sign_last_sync_at,

  viewed_at, created_at,

  fluxo, cliente_contrato_recebido_at, org_contrato_aceito_at, contrato_concluido_at

`.trim();



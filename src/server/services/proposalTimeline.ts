import type { Pool } from 'pg';

export interface ProposalTimelineItem {
  timestamp: string;
  user: string;
  action: string;
  description: string;
}

const EVENT_LABELS: Record<string, { action: string; description: (payload: Record<string, unknown>) => string }> = {
  'proposal.viewed': {
    action: 'Visualização',
    description: () => 'O cliente abriu o link da proposta',
  },
  'proposal.approved': {
    action: 'Aprovação',
    description: () => 'Proposta aprovada pelo cliente',
  },
  'proposal.rejected': {
    action: 'Recusa',
    description: () => 'Proposta recusada pelo cliente',
  },
  'contract_sign.sent': {
    action: 'Contrato enviado',
    description: () => 'Contrato enviado para assinatura',
  },
  'contract_sign.completed': {
    action: 'Assinatura',
    description: () => 'Contrato assinado pelo cliente',
  },
  'contract_sign.send_failed': {
    action: 'Falha no envio',
    description: (p) => String(p.error ?? p.message ?? 'Erro ao enviar contrato para assinatura'),
  },
  'contract.client_receipt_confirmed': {
    action: 'Recebimento',
    description: () => 'Cliente confirmou recebimento do contrato',
  },
  'contract.org_accepted': {
    action: 'Aceite da empresa',
    description: () => 'Empresa aceitou o contrato assinado',
  },
};

function mapEvent(
  event: string,
  receivedAt: string,
  payload: Record<string, unknown>,
): ProposalTimelineItem | null {
  const meta = EVENT_LABELS[event];
  if (!meta) {
    return {
      timestamp: receivedAt,
      user: 'Sistema',
      action: event,
      description: JSON.stringify(payload).slice(0, 200) || '—',
    };
  }
  return {
    timestamp: receivedAt,
    user: (payload.user as string) || (payload.cliente_nome as string) || 'Sistema',
    action: meta.action,
    description: meta.description(payload),
  };
}

export async function buildProposalTimeline(
  pool: Pool,
  organizationId: string,
  proposalId: string,
): Promise<ProposalTimelineItem[]> {
  const { rows: propostaRows } = await pool.query<{
    cliente_nome: string;
    created_at: string;
    data_envio: string | null;
    viewed_at: string | null;
    status: string;
    data_pagamento: string | null;
    pago: boolean;
  }>(
    `SELECT cliente_nome, created_at, data_envio, viewed_at, status, data_pagamento, pago
     FROM propostas WHERE organization_id = $1 AND id = $2`,
    [organizationId, proposalId],
  );
  const row = propostaRows[0];
  if (!row) return [];

  const activities: ProposalTimelineItem[] = [];

  activities.push({
    timestamp: row.created_at,
    user: 'Sistema',
    action: 'Criação',
    description: `Proposta criada para ${row.cliente_nome || 'cliente'}`,
  });

  if (row.data_envio) {
    activities.push({
      timestamp: row.data_envio,
      user: 'Sistema',
      action: 'Envio',
      description: 'Proposta enviada ao cliente',
    });
  }

  if (row.viewed_at) {
    activities.push({
      timestamp: row.viewed_at,
      user: row.cliente_nome || 'Cliente',
      action: 'Visualização',
      description: 'Cliente visualizou a proposta',
    });
  }

  if (row.status === 'aprovada') {
    activities.push({
      timestamp: row.data_envio || row.created_at,
      user: row.cliente_nome || 'Cliente',
      action: 'Aprovação',
      description: 'Proposta aprovada',
    });
  }

  if (row.status === 'recusada') {
    activities.push({
      timestamp: row.viewed_at || row.data_envio || row.created_at,
      user: row.cliente_nome || 'Cliente',
      action: 'Recusa',
      description: 'Proposta recusada pelo cliente',
    });
  }

  if (row.pago && row.data_pagamento) {
    activities.push({
      timestamp: row.data_pagamento,
      user: row.cliente_nome || 'Cliente',
      action: 'Pagamento',
      description: 'Pagamento registrado',
    });
  } else if (row.pago) {
    activities.push({
      timestamp: row.created_at,
      user: 'Sistema',
      action: 'Pagamento',
      description: 'Pagamento registrado',
    });
  }

  const { rows: events } = await pool.query<{
    event: string;
    received_at: string;
    payload: Record<string, unknown>;
  }>(
    `SELECT event, received_at, payload
     FROM integration_events
     WHERE proposal_id = $1
     ORDER BY received_at ASC`,
    [proposalId],
  );

  for (const ev of events) {
    const payload = (ev.payload && typeof ev.payload === 'object' ? ev.payload : {}) as Record<string, unknown>;
    const mapped = mapEvent(ev.event, ev.received_at, payload);
    if (mapped) activities.push(mapped);
  }

  const seen = new Set<string>();
  const deduped: ProposalTimelineItem[] = [];
  for (const a of activities.sort(
    (x, y) => new Date(x.timestamp).getTime() - new Date(y.timestamp).getTime(),
  )) {
    const key = `${a.action}|${a.timestamp}|${a.description}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(a);
  }

  return deduped;
}

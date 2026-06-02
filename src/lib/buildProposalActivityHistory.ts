import type { ActivityHistoryItem } from '../components/listing/ActivityHistoryList';
import type { Proposta } from './store';

export function buildProposalActivityHistory(proposta: Proposta): ActivityHistoryItem[] {
  const items: ActivityHistoryItem[] = [];

  items.push({
    timestamp: proposta.data_criacao,
    user: 'Sistema',
    action: 'Criação',
    description: `Proposta criada para ${proposta.cliente_nome}`,
  });

  if (proposta.data_envio) {
    items.push({
      timestamp: proposta.data_envio,
      user: 'Sistema',
      action: 'Envio',
      description: 'Proposta enviada ao cliente',
    });
  }

  if (proposta.viewedAt) {
    items.push({
      timestamp: proposta.viewedAt,
      user: proposta.cliente_nome,
      action: 'Visualização',
      description: 'Cliente visualizou a proposta',
    });
  }

  if (proposta.status === 'aprovada') {
    items.push({
      timestamp: proposta.data_envio || proposta.data_criacao,
      user: proposta.cliente_nome,
      action: 'Aprovação',
      description: 'Proposta aprovada',
    });
  }

  if (proposta.status === 'recusada') {
    items.push({
      timestamp: proposta.viewedAt || proposta.data_envio || proposta.data_criacao,
      user: proposta.cliente_nome,
      action: 'Recusa',
      description: 'Proposta recusada pelo cliente',
    });
  }

  if (proposta.contractSignStatus === 'sent') {
    items.push({
      timestamp: proposta.contractSignLastSyncAt || proposta.data_criacao,
      user: 'Sistema',
      action: 'Contrato enviado',
      description: 'Aguardando assinatura do cliente',
    });
  }

  if (proposta.contractSignStatus === 'signed') {
    items.push({
      timestamp: proposta.contractSignLastSyncAt || proposta.data_criacao,
      user: proposta.cliente_nome,
      action: 'Assinatura',
      description: 'Contrato assinado pelo cliente',
    });
  }

  if (proposta.clienteContratoRecebidoAt) {
    items.push({
      timestamp: proposta.clienteContratoRecebidoAt,
      user: proposta.cliente_nome,
      action: 'Recebimento',
      description: 'Cliente confirmou recebimento do contrato',
    });
  }

  if (proposta.orgContratoAceitoAt) {
    items.push({
      timestamp: proposta.orgContratoAceitoAt,
      user: 'Empresa',
      action: 'Aceite',
      description: 'Empresa aceitou o contrato',
    });
  }

  if (proposta.pago) {
    items.push({
      timestamp: proposta.data_pagamento || proposta.data_criacao,
      user: proposta.cliente_nome,
      action: 'Pagamento',
      description: 'Pagamento registrado',
    });
  }

  return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

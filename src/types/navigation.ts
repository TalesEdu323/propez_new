/**
 * Tipos compartilhados para navegação entre telas.
 *
 * Antes cada página declarava `navigate: (route: string, params?: any) => void`.
 * Centralizar evita divergência e permite refactors seguros.
 */

export type AppRoute =
  | 'dashboard'
  | 'clientes'
  | 'propostas'
  | 'pagamentos'
  | 'servicos'
  | 'modelos'
  | 'loja-templates'
  | 'contratos'
  | 'criar-modelo'
  | 'propez-fluido'
  | 'visualizar-proposta'
  | 'configuracoes'
  | 'planos'
  | 'admin-dashboard'
  | 'admin-retention'
  | 'admin-acquisition'
  | 'admin-product'
  | 'admin-organizations'
  | 'admin-organization-detail'
  | 'admin-users'
  | 'admin-subscriptions'
  | 'admin-operations'
  | 'admin-marketplace';

export interface RouteParams {
  id?: string;
  editId?: string;
  [key: string]: unknown;
}

export type NavigateFn = (route: AppRoute, params?: RouteParams) => void;

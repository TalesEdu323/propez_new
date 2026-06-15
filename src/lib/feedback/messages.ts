import type { StoreSaveOperation } from '../storeSaveFeedback';
import { confirmAction } from './confirmBus';

export type CatalogEntityKey =
  | 'propez_servicos'
  | 'propez_clientes'
  | 'propez_modelos'
  | 'propez_propostas'
  | 'propez_contratos';

const ENTITY_LABELS: Record<CatalogEntityKey, string> = {
  propez_servicos: 'serviço',
  propez_clientes: 'cliente',
  propez_modelos: 'modelo',
  propez_propostas: 'proposta',
  propez_contratos: 'contrato',
};

const ENTITY_LABELS_CAP: Record<CatalogEntityKey, string> = {
  propez_servicos: 'Serviço',
  propez_clientes: 'Cliente',
  propez_modelos: 'Modelo',
  propez_propostas: 'Proposta',
  propez_contratos: 'Contrato',
};

export function storeSaveSuccessMessage(
  storeKey: CatalogEntityKey,
  operation: StoreSaveOperation,
): string {
  const label = ENTITY_LABELS_CAP[storeKey] ?? 'Registro';
  switch (operation) {
    case 'create':
      return `${label} salvo com sucesso`;
    case 'update':
      return `${label} atualizado com sucesso`;
    case 'delete':
      return `${label} excluído com sucesso`;
    default:
      return `${label} salvo com sucesso`;
  }
}

export function entityLabel(storeKey: CatalogEntityKey): string {
  return ENTITY_LABELS[storeKey] ?? 'registro';
}

export function entityLabelCap(storeKey: CatalogEntityKey): string {
  return ENTITY_LABELS_CAP[storeKey] ?? 'Registro';
}

export async function confirmDelete(
  storeKey: CatalogEntityKey,
  name?: string,
): Promise<boolean> {
  const label = entityLabel(storeKey);
  const cap = entityLabelCap(storeKey);
  const title = `Excluir ${label}?`;
  const description = name
    ? `“${name}” será removido permanentemente. Esta ação não pode ser desfeita.`
    : 'Esta ação não pode ser desfeita.';
  return confirmAction({
    title,
    description,
    confirmLabel: `Excluir ${cap.toLowerCase()}`,
    cancelLabel: 'Cancelar',
    variant: 'danger',
  });
}

export async function confirmDuplicate(storeKey: CatalogEntityKey): Promise<boolean> {
  const label = entityLabel(storeKey);
  const cap = entityLabelCap(storeKey);
  return confirmAction({
    title: `Duplicar ${label}?`,
    description: `Será criada uma cópia deste ${label}.`,
    confirmLabel: `Duplicar ${cap.toLowerCase()}`,
    cancelLabel: 'Cancelar',
    variant: 'primary',
  });
}

export function duplicateSuccessMessage(storeKey: CatalogEntityKey): string {
  const cap = entityLabelCap(storeKey);
  return `${cap} duplicado com sucesso`;
}

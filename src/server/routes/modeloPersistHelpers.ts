import type { Pool } from 'pg';
import { assertJsonSerializable } from '../db/jsonbParam.js';

export class ModeloReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModeloReferenceError';
  }
}

/** Garante que campos JSONB do modelo são serializáveis antes do INSERT/UPDATE. */
export function assertModeloJsonFields(params: {
  elementos: unknown;
  pageLayout: unknown;
  fluxo: unknown;
  signatureConfig: unknown | null | undefined;
}): void {
  assertJsonSerializable(params.elementos, 'elementos');
  assertJsonSerializable(params.pageLayout, 'pageLayout');
  assertJsonSerializable(params.fluxo, 'fluxo');
  if (params.signatureConfig != null) {
    assertJsonSerializable(params.signatureConfig, 'signatureConfig');
  }
}

/** Valida FKs de contrato e serviços antes de persistir — evita 500 opaco por 23503. */
export async function validateModeloReferences(
  pool: Pool,
  orgId: string,
  contratoId: string | null | undefined,
  servicoIds: string[],
): Promise<void> {
  if (contratoId) {
    const { rowCount } = await pool.query(
      `SELECT 1 FROM contratos_templates WHERE organization_id = $1 AND id = $2`,
      [orgId, contratoId],
    );
    if (!rowCount) {
      throw new ModeloReferenceError(
        'Contrato vinculado não existe mais. Selecione outro contrato ou remova a vinculação.',
      );
    }
  }

  if (servicoIds.length === 0) return;

  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM servicos WHERE organization_id = $1 AND id = ANY($2::uuid[])`,
    [orgId, servicoIds],
  );
  const found = new Set(rows.map((r) => r.id));
  const missing = servicoIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new ModeloReferenceError(
      'Um ou mais serviços vinculados não existem mais. Atualize a lista de serviços do modelo.',
    );
  }
}

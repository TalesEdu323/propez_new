import type { Pool } from 'pg';
import type { UserConfig } from '../../../lib/planConfig.js';
import { canUseIa } from '../../../lib/featureFlags.js';
import type { PlanTier } from '../../../lib/planConfig.js';

export class IaGateError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requiredPlan?: PlanTier;

  constructor(message: string, status: number, code: string, requiredPlan?: PlanTier) {
    super(message);
    this.name = 'IaGateError';
    this.status = status;
    this.code = code;
    this.requiredPlan = requiredPlan;
  }
}

export async function assertIaAllowed(pool: Pool, orgId: string): Promise<{ plan: PlanTier }> {
  const month = new Date().toISOString().slice(0, 7);
  const { rows } = await pool.query<{ plan: PlanTier; ia_geracoes: string | null }>(
    `SELECT o.plan, u.ia_geracoes
     FROM organizations o
     LEFT JOIN usage_counters u ON u.organization_id = o.id AND u.month_key = $2
     WHERE o.id = $1`,
    [orgId, month],
  );
  const row = rows[0];
  if (!row) throw new IaGateError('Organização não encontrada', 404, 'org_not_found');

  const config = {
    plan: row.plan ?? 'free',
    usage: {
      propostasThisMonth: 0,
      iaGeracoesThisMonth: Number(row.ia_geracoes ?? 0),
      rubricaAssinaturasThisMonth: 0,
    },
  } as UserConfig;

  const gate = canUseIa(config);
  if (!gate.allowed) {
    throw new IaGateError(
      gate.reason ?? 'IA generativa não disponível no seu plano.',
      403,
      'ia_not_allowed',
      gate.requiredPlan,
    );
  }

  return { plan: row.plan ?? 'free' };
}

export async function incrementIaUsage(pool: Pool, orgId: string): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);
  await pool.query(
    `INSERT INTO usage_counters (organization_id, month_key, ia_geracoes)
     VALUES ($1, $2, 1)
     ON CONFLICT (organization_id, month_key)
     DO UPDATE SET ia_geracoes = usage_counters.ia_geracoes + 1, updated_at = NOW()`,
    [orgId, month],
  );
}

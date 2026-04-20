#!/usr/bin/env node
/**
 * Seed de desenvolvimento.
 *
 * Cria uma conta de dev pronta para uso:
 *   - organization "Propez Dev"
 *   - user dev@propez.local (senha: dev123dev)
 *   - email já verificado
 *   - defaults via seedOrgDefaults (contrato, serviço e 2 modelos)
 *
 * Execução:
 *   DATABASE_URL=postgres://... node scripts/seed-dev.mjs
 *
 * Idempotente: se o usuário já existir, apenas imprime credenciais e sai.
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';

const EMAIL = process.env.SEED_EMAIL || 'dev@propez.local';
const PASSWORD = process.env.SEED_PASSWORD || 'dev123dev';
const COMPANY = process.env.SEED_COMPANY || 'Propez Dev';
const NAME = process.env.SEED_NAME || 'Propez Dev';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error('[seed-dev] DATABASE_URL não configurado.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [EMAIL]);
    if (existing.rows[0]) {
      console.log(`[seed-dev] usuário ${EMAIL} já existe (id=${existing.rows[0].id}).`);
      console.log(`[seed-dev] credenciais: ${EMAIL} / ${PASSWORD}`);
      return;
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    await client.query('BEGIN');

    const u = await client.query(
      `INSERT INTO users (email, password_hash, name, email_verified_at)
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [EMAIL, passwordHash, NAME],
    );
    const userId = u.rows[0].id;

    const o = await client.query(
      `INSERT INTO organizations (name, onboarded) VALUES ($1, FALSE) RETURNING id`,
      [COMPANY],
    );
    const orgId = o.rows[0].id;

    await client.query(
      `INSERT INTO memberships (user_id, organization_id, role) VALUES ($1, $2, 'owner')`,
      [userId, orgId],
    );

    await client.query(
      `INSERT INTO contratos_templates (organization_id, titulo, texto)
       VALUES ($1, $2, $3)`,
      [
        orgId,
        'Contrato de Prestação de Serviços (Padrão)',
        `INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS

CONTRATADA: {{EMPRESA_NOME}} (CNPJ: {{EMPRESA_CNPJ}})
CONTRATANTE: {{CLIENTE_NOME}}

1. OBJETO
Prestação dos serviços: {{SERVICOS_LISTA}}.

2. VALOR
Valor total: {{VALOR_TOTAL}}. Validade: {{DATA_VALIDADE}}.

3. ASSINATURA
Data: {{DATA_ATUAL}}
{{ASSINATURA_IMAGEM}}`,
      ],
    );

    await client.query(
      `INSERT INTO servicos (organization_id, nome, descricao, valor_cents, tipo)
       VALUES ($1, $2, $3, $4, $5)`,
      [orgId, 'Consultoria Estratégica', 'Consultoria padrão de 2 horas.', 350000, 'unico'],
    );

    await client.query(
      `INSERT INTO modelos_propostas (organization_id, nome, elementos, tier)
       VALUES ($1, $2, $3::jsonb, $4)`,
      [
        orgId,
        'Proposta Simples',
        JSON.stringify([
          { id: 'h1', type: 'heading', props: { text: 'Proposta de Serviço', align: 'center' } },
          { id: 'p1', type: 'paragraph', props: { text: 'Uma proposta pronta para começar.', align: 'center' } },
        ]),
        'free',
      ],
    );

    await client.query('COMMIT');

    console.log(`[seed-dev] pronto.
  email       : ${EMAIL}
  senha       : ${PASSWORD}
  organization: ${COMPANY} (id=${orgId})
  user id     : ${userId}
`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error('[seed-dev] erro:', err);
    process.exit(1);
  })
  .finally(() => pool.end());

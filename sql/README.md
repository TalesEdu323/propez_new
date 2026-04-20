# SQL do PropEZ

Copiar/colar no Neon por app (PropEZ + ProSync + nota Rubrica): ver
[docs/NEON_SQL_POR_APP.md](../docs/NEON_SQL_POR_APP.md).

## PropEZ (`sql/`)

Scripts nesta pasta são executados **automaticamente** no boot do servidor
([`src/server/db.ts`](../src/server/db.ts) → `runMigrations` em ordem
lexicográfica). Todos devem ser **idempotentes** (`IF NOT EXISTS`, etc.).

| Arquivo | Função |
|--------|--------|
| `001_integrations.sql` | Tabelas `integration_mappings` e `integration_events` |

Após aplicar, o log deve mostrar:

- `[migrations] applied 001_integrations.sql`
- `[startup] integration schema OK (integration_mappings, integration_events)`

## ProSync (repositório separado)

As tabelas `api_keys`, `outbound_webhooks` e `outbound_webhook_deliveries` **não**
ficam neste repositório. Aplique no **banco PostgreSQL do ProSync**:

```bash
psql "$DATABASE_URL_DO_PROSYNC" -f ../Prosync/scripts/CREATE_API_KEYS_AND_WEBHOOKS.sql
```

(Ajuste o caminho se o clone do ProSync estiver em outro diretório.)

Depois, no dashboard ProSync: **Configurações → Integrações** — crie API Key e
webhook outbound conforme [docs/INTEGRACOES_SMOKE_TEST.md](../docs/INTEGRACOES_SMOKE_TEST.md).

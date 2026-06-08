# SQL do Propez

Copiar/colar no Neon por app (Propez + ProSync + nota Rubrica): ver
[docs/NEON_SQL_POR_APP.md](../docs/NEON_SQL_POR_APP.md).

## Propez (`sql/`)

Scripts nesta pasta são executados **automaticamente** no boot do servidor
([`src/server/db.ts`](../src/server/db.ts) → `runMigrations` em ordem
lexicográfica). Todos devem ser **idempotentes** (`IF NOT EXISTS`, etc.).

### Convenção de nomenclatura

- Prefixo numérico único: `NNN_descricao.sql`
- Duas migrations no mesmo número: `NNNa_` / `NNNb_` (ex.: `007b_notifications.sql`)
- Nunca dois arquivos com o mesmo prefixo `NNN_` sem sufixo

### Migrations automáticas

| Arquivo | Função |
|---------|--------|
| `000_schema_migrations.sql` | Tabela de controle `schema_migrations` |
| `001_integrations.sql` | `integration_mappings`, `integration_events` |
| `002_core.sql` | Tabelas core (orgs, users, propostas, usage_counters, etc.) |
| `003_integrations_org.sql` | Credenciais de integração por organização |
| `004_admin.sql` | Tabelas do painel admin da plataforma |
| `005_suite_credentials.sql` | Credenciais da suíte Taggo |
| `006_sso_identity_links.sql` | Links de identidade SSO |
| `007_admin_analytics.sql` | Analytics do admin |
| `007b_notifications.sql` | Notificações e colunas de proposta |
| `008_proposal_flow_marketplace.sql` | Fluxo de proposta e marketplace |
| `009_servico_layout.sql` | Layout de serviços |
| `010_org_credentials_base_url.sql` | Base URL por org nas credenciais |
| `011_page_layout.sql` | Page layout do builder |
| `012_blog.sql` | Blog |
| `013_org_brand.sql` | Branding por organização |
| `014a_drop_org_media.sql` | Remove mídia legada de org |
| `014b_service_requests.sql` | Solicitações de serviço |
| `015_org_segment.sql` | Segmento da organização |
| `016_contract_signing.sql` | Assinatura de contratos |
| `017_contrato_pdf_upload.sql` | Upload de PDF de contrato |
| `018_google_oauth.sql` | Google OAuth |
| `019_google_calendar.sql` | Google Calendar |
| `020a_affiliates_coupons.sql` | Afiliados e cupons |
| `020b_email_change_requests.sql` | Troca de e-mail |
| `021_contract_pdf_bytes.sql` | PDF de contrato em bytes |
| `022_contrato_template_pdf_bytes.sql` | Template PDF de contrato |
| `023_site_visitors_and_user_prefs.sql` | Visitantes e preferências |
| `024_whatsapp_comprovante.sql` | Comprovante WhatsApp |

Após aplicar migrations pendentes, o log deve mostrar linhas como:

- `[migrations] applied 001_integrations.sql`
- `[startup] integration schema OK (integration_mappings, integration_events)`

### Renomear migrations em banco existente

Se o banco já aplicou arquivos com nomes antigos (`014_*`, `020_*`), execute
**uma vez** antes do deploy:

```bash
npm run migrate:rename-records
```

Ou manualmente:

```sql
UPDATE schema_migrations SET filename = '014a_drop_org_media.sql' WHERE filename = '014_drop_org_media.sql';
UPDATE schema_migrations SET filename = '014b_service_requests.sql' WHERE filename = '014_service_requests.sql';
UPDATE schema_migrations SET filename = '020a_affiliates_coupons.sql' WHERE filename = '020_affiliates_coupons.sql';
UPDATE schema_migrations SET filename = '020b_email_change_requests.sql' WHERE filename = '020_email_change_requests.sql';
```

## ProSync (repositório separado)

As tabelas `api_keys`, `outbound_webhooks` e `outbound_webhook_deliveries` **não**
ficam neste repositório. Aplique no **banco PostgreSQL do ProSync**:

```bash
psql "$DATABASE_URL_DO_PROSYNC" -f ../Prosync/scripts/CREATE_API_KEYS_AND_WEBHOOKS.sql
```

(Ajuste o caminho se o clone do ProSync estiver em outro diretório.)

Depois, no dashboard ProSync: **Configurações → Integrações** — crie API Key e
webhook outbound conforme [docs/INTEGRACOES_SMOKE_TEST.md](../docs/INTEGRACOES_SMOKE_TEST.md).

# Smoke test das integrações Propez + ProSync + Rubrica

Este runbook valida, de ponta a ponta, o fluxo de uma proposta criada a partir
de um lead do ProSync, aprovada pelo cliente e com contrato assinado via
Rubrica. É o último passo do plano de integração.

> Pré-requisito: os três projetos rodando em máquina com acesso a bancos de
> dados PostgreSQL reais (Neon do Propez e ProSync, Postgres do Rubrica) e um
> endpoint público para o Propez (ngrok ou Cloud Run). Webhooks não funcionam
> em `localhost` puro.

## Check automatizado (antes do fluxo manual)

Com o Propez já rodando (`npm run dev`) e `.env` válido:

```powershell
npm run check:integrations
```

Opcional: `PROP_EZ_CHECK_URL=http://127.0.0.1:3000 npm run check:integrations`

O script chama `GET /api/health` e `GET /api/integrations/prosync/leads`. Se a
segunda falhar com 502, confira `PROSYNC_API_KEY` no `.env` do processo Node.

**No CI (GitHub Actions):** o script é executado mas **pula** as chamadas HTTP
a menos que defina `INTEGRATION_CHECK=true` (use em job dedicado com servidor
acessível).

No boot do servidor, confira também os logs de
[`startupDiagnostics`](../src/server/startupDiagnostics.ts): avisos sobre
`PROSYNC_WEBHOOK_SECRET` vazio, `APP_URL` local ou placeholders.

## 0. Variáveis críticas

No `.env` do **Propez**:

```
APP_URL=https://<tunel-publico-propez>
DATABASE_URL=postgres://...
PROSYNC_API_URL=https://<sua-instancia-prosync>
PROSYNC_API_KEY=ps_live_...
PROSYNC_WEBHOOK_SECRET=<mesmo secret gerado ao cadastrar o webhook no ProSync>
RUBRICA_API_URL=https://<sua-instancia-rubrica>
RUBRICA_API_KEY=dm_live_...
RUBRICA_WEBHOOK_SECRET=<usado internamente; o Rubrica não assina, é só docstring>
```

## 1. Provisionar a API Key do ProSync

1. Suba o ProSync (`pnpm dev` em `Prosync/`).
2. Aplique o migration no **Postgres do ProSync** (não é arquivo do Propez):

   ```bash
   psql "$DATABASE_URL_DO_PROSYNC" -f scripts/CREATE_API_KEYS_AND_WEBHOOKS.sql
   ```

   (No repositório `Prosync/`; detalhes em [sql/README.md](../sql/README.md).)
3. Entre no dashboard como **owner/admin** e acesse
   `Configurações → Integrações`.
4. Crie uma API Key com escopos `crm:read, crm:write`. Copie a chave
   `ps_live_...` (só é mostrada uma vez) e cole em `PROSYNC_API_KEY` do Propez.
5. Ainda em Integrações, crie um **Outbound Webhook**:
   - URL: `https://<tunel-publico-propez>/api/webhooks/prosync`
   - Eventos: `lead.created, lead.updated, lead.status_changed, lead.sale_confirmed`
   - Copie o `secret` exibido e cole em `PROSYNC_WEBHOOK_SECRET` do Propez.

## 2. Provisionar a API Key do Rubrica

1. Suba o Rubrica (`pnpm dev` em `Rubrica-Assinaturas/`).
2. Em `/dashboard/integracoes`, gere uma API Key (`dm_live_...`) e cole em
   `RUBRICA_API_KEY` do Propez.
3. Não é preciso configurar webhook manualmente — o Propez envia a
   `webhookUrl` dinamicamente em cada `/api/signature/send`, já com o secret
   em query string.

## 3. Subir o Propez e aplicar migrations

```powershell
cd C:\Users\suporte\GitHub\propez_new
npm run dev
```

O servidor roda `sql/001_integrations.sql` (idempotente) em cada boot.
Confira no log:

- `[migrations] applied 001_integrations.sql`
- `[startup] integration schema OK (integration_mappings, integration_events)`

Abra `http://localhost:3000/api/health`; deve retornar:

```json
{ "status": "ok", "database": true,
  "integrations": { "prosync": true, "rubrica": true } }
```

## 4. Criar um lead no ProSync

Dashboard do ProSync → CRM → Novo Lead. Preencha nome, email, telefone.
Aguarde ~1s e confira no log do Propez uma linha
`[webhooks/prosync] event=lead.created` (isso valida que o ProSync está
assinando com HMAC e o Propez está validando).

## 5. Abrir o PropezFluido e importar

1. Logue no Propez e clique em **Nova proposta**.
2. Avance até o passo 2 e clique em **Importar do ProSync**. O modal abre
   chamando `GET /api/integrations/prosync/leads`. Escolha o lead criado.
3. Finalize a proposta e gere. No passo de salvamento, o backend chama
   `PATCH /prosync/leads/:id` com `status=contacted`. Confira no ProSync que o
   lead agora está como **Contactado**.

## 6. Aprovar a proposta (simulando o cliente)

1. Abra `?route=visualizar-proposta&id=<id>` em uma aba anônima.
2. Clique em **Aprovar e Continuar**. Informe CPF/email no modal.
3. Backend executa em sequência:
   - `PATCH /prosync/leads/:leadId` → `status=qualified`.
   - `POST /rubrica/send`: gera PDF (pdfmake) → upload → send-for-signature.
   - Persiste mapping em `integration_mappings` (status = `sent`).
4. A página mostra "Rubrica — Aguardando assinatura" com link para assinar.
5. O frontend começa a chamar `GET /api/integrations/rubrica/status/:id` a cada
   15s.

## 7. Assinar no Rubrica

Clique no link de assinatura e complete o fluxo. Assim que o Rubrica dispara
o webhook `document.signed`, o Propez:

- valida o secret em query string;
- atualiza `integration_mappings.status = 'signed'`;
- dispara `PATCH /prosync/leads/:leadId` → `status=converted`;
- loga o evento em `integration_events`.

No front, o polling detecta `signed` e libera o botão **Baixar PDF Assinado**
(`GET /api/integrations/rubrica/download/:id`, proxy autenticado para o
Rubrica).

## 8. Checagens finais

No Postgres do Propez:

```sql
SELECT * FROM integration_mappings ORDER BY updated_at DESC LIMIT 5;
SELECT source, event, proposal_id, signature_valid, received_at
FROM integration_events ORDER BY received_at DESC LIMIT 20;
```

Espera-se, para uma proposta bem-sucedida, a cadeia:

| source   | event                | signature_valid |
| -------- | -------------------- | --------------- |
| prosync  | lead.created         | true            |
| internal | prosync.lead.updated | null            |
| internal | rubrica.sent         | null            |
| rubrica  | document.signed      | true            |
| prosync  | lead.status_changed  | true            |
| prosync  | lead.sale_confirmed  | true            |

E no ProSync, o lead deve ter passado por: **novo → contactado → qualificado
→ convertido**, com uma venda registrada quando for o caso.

## 9. Evidência no ProSync (webhooks outbound)

No Postgres **do ProSync**, confirme entregas com sucesso:

```sql
SELECT id, event, status, attempts, http_status, error, last_attempt_at, created_at
FROM outbound_webhook_deliveries
ORDER BY created_at DESC
LIMIT 20;
```

Esperado após criar um lead (com webhook configurado): pelo menos uma linha com
`status = 'success'` e `http_status` entre 200 e 299. Se `status = 'failed'`,
inspecione `error` e `response_body` (URL do Propez inacessível, assinatura
rejeitada no Propez, etc.).

## Troubleshooting

- `401 Assinatura inválida` no webhook ProSync → confirme que
  `PROSYNC_WEBHOOK_SECRET` é exatamente o secret mostrado ao criar o webhook.
- `401 Secret inválido` no webhook Rubrica → a URL de retorno precisa conter
  `?secret=...` inalterado; qualquer proxy que strip-e query vai quebrar.
- `502 upstream=prosync.updateLead` → API key revogada, URL incorreta ou lead
  que pertence a outra organização.
- `pdfmake` falha com `ENOENT Roboto-*.ttf` → rodar `npm install` para trazer
  a pasta `node_modules/pdfmake/fonts/Roboto/*.ttf`.

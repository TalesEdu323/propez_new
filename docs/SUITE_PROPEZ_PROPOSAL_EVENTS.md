# Propez → ProSync: eventos `proposal-events`

O ProSync reage a `POST /api/partner/proposal-events` (HMAC com `TAGGO_SUITE_SECRET`). Este documento descreve **quando o Propez emite cada evento** e o que o ProSync faz com `proposal.sent` (ver repositório ProSync: `docs/SUITE_PROPEZ_PROPOSAL_EVENTS.md`).

## Modelo SaaS (multi-tenant)

| Camada | O quê |
|--------|--------|
| **Plataforma Propez** | `TAGGO_SUITE_SECRET` — segredo HMAC da suíte Taggo (mesmo deployment / apps parceiros). Não é “a API de um cliente”. |
| **Cada organização (cliente SaaS)** | Credencial ProSync em **Configurações → Integrações**: API key, URL base opcional (`api_base_url`), `external_org_id` após provisionamento. |
| **Cada proposta** | `prosync_lead_id` — lead no CRM **daquela** org ProSync. |

O `POST /api/partner/proposal-events` vai para a **URL ProSync da organização** (credencial salva ou fallback de desenvolvimento), com `organizationId` = tenant ProSync da org. **Não** usa só `PROSYNC_API_URL` global para todos os clientes.

Sem credencial ProSync configurada para a org, o evento é ignorado (`prosync_nao_configurado_para_org`).

## Pré-requisitos

| Item | Uso |
|------|-----|
| `TAGGO_SUITE_SECRET` | HMAC partner (`>= 32` chars), igual no ProSync do deployment |
| Integração ProSync por org | Provisionar suíte ou colar API key + URL em Configurações |
| `prosync_lead_id` na proposta | Lead no CRM da org |

`PROSYNC_API_URL` no `.env` é apenas **default** quando a org não define URL própria (dev / single-tenant).

## Implementação no Propez

Cliente: `src/server/clients/suiteProposalEvents.ts`  
Headers: `x-taggo-suite-signature`, `x-taggo-suite-timestamp`, `x-taggo-suite-app: propez`

## Quando cada evento é emitido

| Evento | Momento no Propez | Observação ProSync |
|--------|-------------------|-------------------|
| `proposal.created` | `POST /api/propostas` (criação) | Registro em `lead_external_proposals` |
| **`proposal.sent`** | **`POST /api/propostas/:id/send-email`** (e-mail ao cliente com link) | **1ª vez:** lead `new` → `contacted`, tag **"Proposta enviada"**, timeline |
| `proposal.sent` | `PATCH /api/propostas/:id` quando `data_envio` passa de vazio → preenchido | Mesmo efeito (envio manual / API) |
| `proposal.viewed` | Primeira abertura do link público `GET /api/public/propostas/:token` | Visualização |
| `proposal.approved` | Decisão pública ou `PATCH` status → `aprovada` | Aprovação |
| `proposal.rejected` | Decisão pública ou `PATCH` status → `recusada` | Recusa |
| `proposal.signed` | Webhook Rubrica `document.signed` | Contrato assinado |

**Não** emitimos mais `proposal.sent` ao enviar contrato para o Rubrica (`POST /api/integrations/rubrica/send`). Isso é assinatura de contrato; o CRM usa `proposal.sent` para **proposta comercial enviada ao cliente**.

## Payload mínimo (`proposal.sent`)

```json
{
  "event": "proposal.sent",
  "externalId": "<uuid proposta no Propez>",
  "leadId": "<id lead no ProSync>",
  "title": "Proposta para Cliente X",
  "publicUrl": "https://app.propez.com/p/<token>",
  "status": "sent",
  "valueCents": 150000,
  "currency": "BRL",
  "externalUpdatedAt": "2026-05-27T12:00:00.000Z"
}
```

## Checklist de teste

1. Proposta com `prosync_lead_id` preenchido.
2. `TAGGO_SUITE_SECRET` igual nos dois apps.
3. Enviar proposta: **Configurações → proposta → Enviar por e-mail** (ou `POST .../send-email`).
4. No ProSync: lead em `contacted`, tag **Proposta enviada**, interações na timeline.
5. Logs Propez (sucesso): `[suite/proposal-events] proposal.sent crm: { statusUpdated, tagApplied }` se o ProSync devolver `crm` na resposta.

## Fluxo resumido

```
Propez envia e-mail da proposta → proposal.sent (HMAC)
  → ProSync: lead_external_proposals.status = sent
  → (1ª vez) lead new→contacted + tag "Proposta enviada"
```

Cliente aprova → `proposal.approved` → Rubrica (se configurado) → assinatura → `proposal.signed`.

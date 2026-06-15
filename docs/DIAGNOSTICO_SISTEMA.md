# Diagnostico tecnico do sistema

Este documento consolida o funcionamento atual do projeto, os contratos entre frontend/backend e os pontos de risco observados antes de novos ajustes.

## 1. Arquitetura real (visao geral)

### 1.1 Camadas principais

- Frontend SPA em React/Vite (`src/main.tsx`, `src/App.tsx`).
- Backend Express no mesmo projeto (`server.ts`, `src/server/app.ts`).
- Persistencia principal em PostgreSQL via `pg` (`src/server/db.ts`).
- Cache de dados no cliente via store em memoria (`src/lib/store.ts`).
- Integracoes externas (ProSync, Rubrica, Stripe) no backend (`src/server/routes/integrations.ts`, `src/server/routes/stripe.ts`).

### 1.2 Fluxo de execucao

1. `server.ts` carrega env, sobe Express e acopla Vite em dev.
2. `src/server/app.ts` registra middlewares e rotas `/api/*`.
3. Frontend inicializa em `src/main.tsx` e chama `bootstrapSession()`.
4. `src/App.tsx` controla rota interna por estado e faz hydration do store apos sessao.
5. `src/lib/store.ts` sincroniza CRUD com API e abastece os hooks de tela.

### 1.3 Ordem sensivel de middlewares (backend)

Em `src/server/app.ts`:

- CORS/cookies primeiro.
- Webhook Stripe em raw body antes de `express.json`.
- Webhooks de integracao.
- `express.json`.
- Rotas de auth.
- Rotas autenticadas de negocio (`/api/propostas`, etc.).
- Rotas publicas (`/api/public/propostas`).

Essa ordem e critica para evitar quebra de webhooks e parsing de payload.

## 2. Contratos frontend/backend (fluxo proposta)

Documentacao completa do fluxo (criacao ate pagamento): [`FLUXO_NOVA_PROPOSTA.md`](./FLUXO_NOVA_PROPOSTA.md).

### 2.1 Criacao e edicao

- Frontend: `src/pages/PropezFluido.tsx` chama `createProposta`/`updateProposta` de `src/lib/store.ts`.
- Store converte para payload HTTP via `toPropostaPayload`.
- Backend valida em `src/server/routes/propostas.ts` com Zod (`bodySchema`, `patchSchema`).

Campos criticos validados no backend:

- `cliente_id`, `modelo_id`, `id`: UUID (ou null/omitido).
- `servicos`: array de UUID.
- `valor`: numero >= 0.
- `data_envio`, `data_validade`, `data_pagamento`: `z.string().datetime()` quando presentes.

### 2.2 Link publico

- Frontend gera por `generatePublicLink(propostaId)` em `src/lib/store.ts`.
- Backend responde em `POST /api/propostas/:id/public-link` (`src/server/routes/propostas.ts`).
- URL publica final no formato `/p/{token}`.
- Tela publica consome `GET /api/public/propostas/:token` em `src/pages/PublicProposta.tsx`.

### 2.3 Visualizacao interna

- Rota interna `visualizar-proposta` usa `id` vindo de query params em `src/App.tsx`.
- Tela `src/pages/VisualizarProposta.tsx` busca proposta pelo cache (`usePropostas`).

## 3. Integracoes externas e comportamento em falha

### 3.1 ProSync

- Chamadas no frontend via `src/services/crmApi.ts` para endpoints backend `/api/integrations/prosync/*`.
- Sem disponibilidade do ProSync, fluxo principal de proposta continua; atualizacao CRM e best-effort.

### 3.2 Rubrica

- Envio e status via `src/services/rubricaApi.ts` para `/api/integrations/rubrica/*`.
- Aprovacao de proposta pode continuar com `rubricaStatus=failed` quando upstream falha.

### 3.3 Stripe

- Isolado para planos/checkout em `src/server/routes/stripe.ts`.
- Nao e dependencia direta para criar proposta.

## 4. Matriz de erros atuais (causa raiz e impacto)

| Erro observado | Causa raiz | Arquivo/trecho | Impacto | Prioridade |
|---|---|---|---|---|
| `400 Dados inválidos` em `POST /api/propostas` | Payload pode quebrar schema (UUID/date-time) quando entrada nao normalizada | `src/lib/store.ts` (`toPropostaPayload`) + `src/server/routes/propostas.ts` (`bodySchema`) | Proposta nao persiste, bloqueia fluxo | Alta |
| `404 Proposta não encontrada` em `/api/propostas/:id/public-link` | Efeito cascata apos falha de criacao da proposta | `src/pages/propezFluido/SuccessStep.tsx` + `src/server/routes/propostas.ts` | Link publico nao e gerado | Alta |
| Tela interna mostra nao encontrada em acesso direto | `id` ausente em parse da query ou cache nao hidratado no timing inicial | `src/App.tsx`, `src/pages/VisualizarProposta.tsx` | Usuario perde acesso direto por URL | Media |
| Integracao externa falha sem bloquear UI | Chamadas ProSync/Rubrica sao best-effort em partes do fluxo | `src/pages/PropezFluido.tsx`, `src/pages/VisualizarProposta.tsx` | Inconsistencia operacional sem travar venda | Media |

## 5. Diretrizes para ajustes seguros

1. Ajustar primeiro contrato de payload proposta (UUID/datas).
2. Manter mudancas pequenas e localizadas no fluxo de proposta.
3. So depois revisar robustez das integracoes e mensagens de erro.
4. Validar cada bloco com testes funcionais minimos antes de seguir.

## 6. Observabilidade minima recomendada (producao)

- Padronizar logs por contexto:
  - `[propostas/create]`, `[propostas/update]`, `[public/proposta]`, `[public/decision]`
  - `[integrations:prosync.*]`, `[integrations:rubrica.*]`, `[stripe/*]`
- Sempre incluir no log:
  - `proposalId` quando aplicavel,
  - `orgId` quando aplicavel,
  - `upstream` e `code` em erros de integracao.
- Diferenciar claramente erros de integracao:
  - DNS (`ENOTFOUND`, `EAI_AGAIN`),
  - timeout (`ABORT_ERR`),
  - erro HTTP do upstream.

## 7. Checklist rapido pre-deploy

1. `GET /api/health` com `status=ok`, `database=true`.
2. Fluxo de proposta:
   - criar proposta com cliente existente,
   - criar proposta sem cliente existente,
   - gerar link `/p/{token}` sem 404.
3. Fluxo publico:
   - abrir link anonimo,
   - registrar decisao approve/reject,
   - validar comportamento de reenvio de decisao (409 esperado).
4. Integracoes:
   - ProSync sem erro de DNS,
   - Rubrica com envio e status consultavel,
   - Stripe com `/api/stripe/plans` e checkout iniciando.

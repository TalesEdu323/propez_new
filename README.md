# Propez

Aplicação web para criação, envio e acompanhamento de propostas comerciais com fluxo integrado de CRM, assinatura digital e pagamentos.

## Stack

- Node.js + TypeScript
- React + Vite
- Express
- PostgreSQL
- Stripe, ProSync e Rubrica (integrações)

## Estrutura do projeto

```
propez_new/
|-- src/                # frontend + backend da aplicação
|   |-- components/     # componentes reutilizáveis
|   |-- pages/          # páginas e fluxos de tela
|   |-- server/         # API, auth, rotas e serviços server-side
|   |-- lib/            # utilitários compartilhados
|   `-- services/       # clientes para integrações externas
|-- docs/               # documentação técnica e runbooks
|-- scripts/            # scripts de apoio e validação
|-- sql/                # migrations e SQL de apoio
|-- server.ts           # bootstrap do servidor
`-- package.json        # scripts e dependências
```

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL (ex.: Neon)

## Configuração local

1. Instale dependências:
   - `npm install`
2. Crie seu arquivo de ambiente:
   - copie `.env.example` para `.env`
3. Preencha as variáveis obrigatórias (ver seção [Variáveis de ambiente](#variáveis-de-ambiente)).
4. Rode o projeto:
   - `npm run dev`
5. Valide a conexão:
   - `curl http://localhost:3000/api/health` deve retornar `status: "ok"` e o estado de cada integração.
   - `npm run check:integrations` roda smoke check assistido.

Aplicação padrão: `http://localhost:3000`.

## Variáveis de ambiente

O servidor lê variáveis do `process.env` em três pontos centrais:

- [`server.ts`](server.ts) carrega o `.env` da raiz via `dotenv.config()` (dev).
- [`src/server/env.ts`](src/server/env.ts) valida e tipa as variáveis obrigatórias (`APP_URL`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`).
- [`src/server/config.ts`](src/server/config.ts) carrega as integrações opcionais (ProSync, Rubrica).

No boot, [`src/server/startupDiagnostics.ts`](src/server/startupDiagnostics.ts) imprime avisos sobre placeholders e configurações inconsistentes. Em runtime, `GET /api/health` ([`src/server/routes/health.ts`](src/server/routes/health.ts)) reporta o estado de cada integração com `warnings` legíveis.

### Dev local

1. Copiar `.env.example` para `.env` e preencher os campos marcados com `<PREENCHER>`.
2. Para receber webhooks externos (ProSync, Stripe, Rubrica) em dev, expor a porta com um túnel público (`ngrok http 3000`) e ajustar `APP_URL` para a URL pública.

### Produção

Em produção **não** se usa `.env`: cadastre cada variável no painel do provedor (Cloud Run, Vercel, Render, VPS via systemd/Docker). Consulte [`docs/DEPLOY.md`](docs/DEPLOY.md) para a checklist completa por plataforma.

Runbooks relacionados:

- Smoke test ponta a ponta: [`docs/INTEGRACOES_SMOKE_TEST.md`](docs/INTEGRACOES_SMOKE_TEST.md)
- Checklist de deploy: [`docs/DEPLOY.md`](docs/DEPLOY.md)

## Scripts principais

- `npm run dev`: executa aplicação em modo desenvolvimento
- `npm run build`: build de produção (frontend)
- `npm run start`: sobe servidor em modo produção
- `npm run lint`: verificação de tipos TypeScript
- `npm run test`: executa testes unitários (Vitest)
- `npm run check:integrations`: smoke check das integrações
- `npm run seed:dev`: seed básico para ambiente local

## Documentação

- Índice geral: `docs/README.md`
- SQL por aplicação: `docs/NEON_SQL_POR_APP.md`
- Smoke test integrações: `docs/INTEGRACOES_SMOKE_TEST.md`
- Notas de integração: `docs/integracoes/`

## Boas práticas de organização

- Não commitar segredos (`.env`, tokens, chaves privadas)
- Manter documentação nova dentro de `docs/`
- Usar nomes de arquivo descritivos e consistentes (ex.: `kebab-case`)
- Evitar arquivos temporários na raiz do repositório

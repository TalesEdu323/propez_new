# Documentação — Suíte Taggo

Pasta central com tudo para configurar e testar a integração nativa entre **Propez**, **ProSync**, **Rubrica** e o **IdP** (site Taggo).

## Por onde começar

| Situação | Documento |
|----------|-----------|
| **Teste real em produção** (ProSync/Rubrica já no ar) | **[TESTE-REAL-POR-PROJETO.md](./TESTE-REAL-POR-PROJETO.md)** |
| Desenvolvimento local do zero | [GUIA-COMPLETO.md](./GUIA-COMPLETO.md) |
| Marcar progresso | [CHECKLIST.md](./CHECKLIST.md) |
| Detalhes por fase + troubleshooting | [SUITE-TAGGO-TESTES.md](../SUITE-TAGGO-TESTES.md) |

## Arquivos nesta pasta

```
docs/suite-taggo/
├── README.md                      ← você está aqui
├── TESTE-REAL-POR-PROJETO.md      ← produção, por projeto (comece aqui se já no ar)
├── GUIA-COMPLETO.md               ← local + produção misto
├── CHECKLIST.md
├── templates/
│   ├── *.env.production.example   ← Vercel produção (https)
│   └── *.env.local.example        ← desenvolvimento local
└── sql/
    ├── SITE-taggo-oidc.sql
    ├── PROPEZ-suite.sql
    ├── PROSYNC-suite.sql
    └── RUBRICA-suite.sql
```

## Repositórios na sua máquina

| Projeto | Caminho |
|---------|---------|
| Site Taggo (IdP) | `C:\Users\suporte\GitHub\site-novo-tgs` |
| Propez | `C:\Users\suporte\GitHub\propez_new` |
| ProSync | `C:\Users\suporte\GitHub\Prosync` |
| Rubrica | `C:\Users\suporte\GitHub\Rubrica-Assinaturas` |

## Portas em desenvolvimento local

| Serviço | URL |
|---------|-----|
| IdP (site) | http://localhost:3000 |
| ProSync | http://localhost:3001 |
| Rubrica | http://localhost:3002 |
| Propez | http://localhost:3003 |

## Um segredo, quatro apps

`TAGGO_SUITE_SECRET` deve ser **exatamente igual** em:

- `site-novo-tgs/.env.local`
- `propez_new/.env`
- `Prosync/.env.local`
- `Rubrica-Assinaturas/.env`

## Script auxiliar (Propez)

```powershell
cd C:\Users\suporte\GitHub\propez_new
$env:TAGGO_SUITE_SECRET="seu-secret"
node scripts/suite-hmac.mjs propez '{"email":"teste@taggo.com.br"}'
```

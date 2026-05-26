# Documentação — Suíte Taggo

Pasta central com tudo para configurar e testar a integração nativa entre **Propez**, **ProSync**, **Rubrica** e o **IdP** (site Taggo).

## Por onde começar

| Ordem | Documento | Para quê |
|-------|-----------|----------|
| 1 | **[GUIA-COMPLETO.md](./GUIA-COMPLETO.md)** | Passo a passo do zero ao fim (siga na ordem) |
| 2 | **[CHECKLIST.md](./CHECKLIST.md)** | Marcar cada item concluído |
| 3 | [SUITE-TAGGO-TESTES.md](../SUITE-TAGGO-TESTES.md) | Detalhes de testes por fase + troubleshooting |

## Arquivos nesta pasta

```
docs/suite-taggo/
├── README.md                 ← você está aqui
├── GUIA-COMPLETO.md          ← guia principal (siga este)
├── CHECKLIST.md              ← lista para marcar
├── templates/                ← copiar para .env de cada projeto
│   ├── site-taggo.env.local.example
│   ├── propez.env.example
│   ├── prosync.env.local.example
│   └── rubrica.env.example
└── sql/                      ← SQL puro para colar no Neon
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

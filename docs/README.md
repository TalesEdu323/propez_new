# Documentacao tecnica

Este diretorio concentra a documentacao funcional e operacional do Propez.

## Estrutura

- `DEPLOY.md`: checklist de variaveis de ambiente e deploy por plataforma (Cloud Run, Vercel, Render, VPS).
- `INTEGRACOES_SMOKE_TEST.md`: runbook de validacao ponta a ponta das integracoes.
- `NEON_SQL_POR_APP.md`: orientacoes de SQL/migrations por aplicacao (Propez, ProSync e Rubrica).
- `neon_APENAS_propez.sql`: script consolidado para banco do Propez.
- `neon_APENAS_prosync.sql`: script consolidado para banco do ProSync.
- `rubrica_schema_from_prisma.sql`: schema SQL exportado do Prisma do Rubrica.
- `integracoes/`: documentos de planejamento, handover e detalhes da integracao.

## Convencoes

- Toda documentacao nova deve ficar dentro de `docs/`.
- Evite criar arquivos de documentacao na raiz do repositorio.
- Sempre que um fluxo mudar, atualize primeiro o runbook correspondente.

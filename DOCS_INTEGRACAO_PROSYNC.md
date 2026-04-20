# Integração Propez <-> ProSync

Este documento detalha como realizar a integração técnica entre o Propez e o seu sistema ProSync para automação de leads e propostas.

## 1. Arquitetura da Integração

A integração é baseada em chamadas REST API. O Propez (Frontend) consome os endpoints do ProSync para ler dados de leads e enviar atualizações de propostas.

### Fluxo de Dados
1. **Busca de Leads:** O Propez chama `GET /api/v1/leads` no ProSync.
2. **Criação de Proposta:** Ao salvar, o Propez chama `POST /api/v1/proposals` no ProSync.
3. **Atualização de Status:** Quando o cliente aprova/recusa, o Propez chama `PATCH /api/v1/leads/{id}`.

## 2. Configuração de Variáveis de Ambiente

No arquivo `.env`, você deve configurar as credenciais do ProSync:

```env
VITE_PROSYNC_API_URL=https://api.prosync.com.br
VITE_PROSYNC_API_KEY=seu_token_aqui
```

## 3. Endpoints Necessários no ProSync

Para que a integração funcione plenamente, o ProSync deve expor:

- `GET /leads`: Retorna lista de leads (nome, email, empresa, id).
- `POST /proposals`: Recebe os dados da proposta gerada no Propez.
- `PATCH /leads/:id`: Atualiza o status do lead baseado na interação com a proposta.

## 4. Implementação no Código

As funções de comunicação estão centralizadas em `src/services/crmApi.ts`. 

### Exemplo de busca de Lead:
```typescript
export async function fetchLeadsFromProSync() {
  const response = await fetch(`${import.meta.env.VITE_PROSYNC_API_URL}/leads`, {
    headers: { 'Authorization': `Bearer ${import.meta.env.VITE_PROSYNC_API_KEY}` }
  });
  return await response.json();
}
```

## 5. Próximos Passos Recomendados

1. **Webhooks:** Configure um Webhook no Propez para notificar o ProSync em tempo real quando uma proposta for visualizada.
2. **Mapeamento de Campos:** Garanta que os nomes dos campos (ex: `cliente_nome` vs `lead_name`) estejam alinhados entre os dois sistemas.

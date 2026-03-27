# Plano de Integração PropEZ

Este documento mapeia as integrações necessárias para tornar o fluxo do PropEZ funcional com sistemas externos e o fluxo de pagamentos.

## 1. Fluxo de Integração

O ciclo de vida de uma proposta no PropEZ seguirá este fluxo:

1.  **Criação**: O usuário cria a proposta no PropEZ, selecionando um lead vindo do **ProSync**.
2.  **Envio**: A proposta é enviada ao cliente. O status no **ProSync** é atualizado para "Proposta Enviada".
3.  **Aprovação**: O cliente aprova a proposta.
    *   O **PropEZ** notifica o **ProSync** para atualizar o status do projeto.
    *   O **PropEZ** envia o contrato para o **Rubrica** para coleta de assinaturas.
4.  **Pagamento**: O cliente visualiza as opções de pagamento (PIX ou Link) configuradas manualmente na proposta.
5.  **Conciliação**: O usuário marca a proposta como "Paga" na nova aba de Pagamentos do PropEZ.

---

## 2. Detalhes Técnicos das Integrações

### A. ProSync (CRM & Status)
*   **Objetivo**: Sincronizar leads e atualizar o progresso do fechamento.
*   **Endpoints Necessários**:
    *   `GET /leads`: Para listar potenciais clientes.
    *   `POST /proposals/status`: Para atualizar o status (Pendente -> Aprovada/Recusada).
*   **Arquivo**: `src/services/crmApi.ts`

### B. Rubrica (Assinatura de Contratos)
*   **Objetivo**: Automatizar o envio de contratos após a aprovação da proposta.
*   **Fluxo**:
    1.  Ao aprovar, o PropEZ envia o `contratoTexto` e os dados do cliente para o Rubrica.
    2.  O Rubrica gera o documento e envia o link de assinatura por e-mail.
*   **Arquivo**: `src/services/rubricaApi.ts`

### C. Sistema de Pagamentos (Manual Inicial)
*   **Objetivo**: Facilitar o recebimento sem integração direta com gateways (inicialmente).
*   **Campos na Proposta**:
    *   `chavePix`: Chave para transferência imediata.
    *   `linkPagamento`: URL externa (ex: Mercado Pago, Stripe, Juno).
*   **Aba de Pagamentos**: Uma visão gerencial para o usuário controlar o fluxo de caixa.

---

## 3. Alterações na Estrutura de Dados

A interface `Proposta` no `store.ts` será expandida:

```typescript
interface Proposta {
  // ... campos existentes
  chavePix?: string;      // Manual
  linkPagamento?: string; // Manual
  pago: boolean;          // Status financeiro
  data_pagamento?: string;
}
```

---

## 4. Próximos Passos de Implementação

1.  [ ] Expandir `store.ts` com novos campos financeiros.
2.  [ ] Criar mock service `rubricaApi.ts`.
3.  [ ] Adicionar campos de pagamento no formulário de `PropezFluido.tsx`.
4.  [ ] Implementar a lógica de disparo de integrações em `VisualizarProposta.tsx`.
5.  [ ] Criar a interface de gestão de pagamentos em `Propostas.tsx`.

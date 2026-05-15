# Guia de Integração: Rubrica & ProSync

Este documento serve como guia para a continuidade do desenvolvimento das integrações externas do Propez.

## 1. ProSync (CRM & Leads)

O **ProSync** é o CRM externo que fornece leads para o Propez e recebe atualizações de status das propostas.

### Arquivos Relevantes:
- `src/services/crmApi.ts`: Contém as interfaces e funções de comunicação.
- `src/pages/PropezFluido.tsx`: Implementa o botão de importação de leads do ProSync.
- `src/pages/VisualizarProposta.tsx`: Notifica o ProSync quando uma proposta é aprovada/recusada.

### Próximos Passos para o Cursor:
1.  **Substituir Mocks**: No arquivo `src/services/crmApi.ts`, trocar as respostas estáticas por chamadas `fetch` reais usando `import.meta.env.VITE_PROSYNC_API_URL`.
2.  **Mapeamento de Campos**: Garantir que os campos do lead do ProSync (ex: `company_name`) sejam mapeados corretamente para o objeto `Cliente` do Propez.
3.  **Sincronização Bidirecional**: Implementar um webhook no backend (`server.ts`) que receba atualizações do ProSync (ex: lead excluído ou atualizado).

---

## 2. Rubrica (Assinatura Digital)

O **Rubrica** é o serviço responsável pela coleta de assinaturas digitais nos contratos gerados pelo Propez.

### Arquivos Relevantes:
- `src/services/rubricaApi.ts`: Contém a lógica de envio de documentos para assinatura.
- `src/pages/VisualizarProposta.tsx`: Dispara o envio para o Rubrica assim que o cliente clica em "Aprovar Proposta".

### Próximos Passos para o Cursor:
1.  **Fluxo de Assinatura**: Atualmente, o app apenas envia o documento. É necessário implementar a captura do `signingUrl` retornado pelo Rubrica e exibi-lo ao usuário ou redirecioná-lo.
2.  **Status da Assinatura**: Criar um endpoint no `server.ts` para receber webhooks do Rubrica informando quando o documento foi assinado.
3.  **Download do PDF Assinado**: Após a assinatura, o Rubrica fornece um link para o PDF final. O Propez deve armazenar esse link na proposta (`pago: true` ou um novo campo `assinado: true`).

---

## 3. Configuração de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas no ambiente de produção:

```env
VITE_PROSYNC_API_URL=https://api.prosync.com.br
VITE_PROSYNC_API_KEY=sua_chave_aqui

VITE_RUBRICA_API_URL=https://api.rubrica.com.br
VITE_RUBRICA_API_KEY=sua_chave_aqui
```

## 4. Fluxo de Trabalho Recomendado

1.  **Homologação**: Utilize os ambientes de sandbox/staging de ambos os serviços.
2.  **Logs**: Mantenha os logs de integração no console (ou em banco) para facilitar o debug de falhas de comunicação.
3.  **Tratamento de Erros**: Implementar retentativas (retries) em caso de falha na rede ao enviar dados para o Rubrica.

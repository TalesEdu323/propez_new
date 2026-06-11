import type { ModeloProposta } from './store';

/** Mescla resposta da API (summary ou completa) com o estado local após create/update. */
export function mergeModeloAfterSave(local: ModeloProposta, api: ModeloProposta): ModeloProposta {
  const apiHasElementos = Array.isArray(api.elementos) && api.elementos.length > 0;
  return {
    ...local,
    id: api.id,
    nome: api.nome ?? local.nome,
    servicos: api.servicos?.length ? api.servicos : local.servicos,
    contratoId: api.contratoId ?? local.contratoId,
    chavePix: api.chavePix ?? local.chavePix,
    linkPagamento: api.linkPagamento ?? local.linkPagamento,
    whatsappComprovante: api.whatsappComprovante ?? local.whatsappComprovante,
    tier: api.tier ?? local.tier,
    fluxo: api.fluxo ?? local.fluxo,
    data_criacao: api.data_criacao ?? local.data_criacao,
    elementos: apiHasElementos ? api.elementos! : local.elementos,
    pageLayout: apiHasElementos ? (api.pageLayout ?? local.pageLayout) : local.pageLayout,
    contratoTexto:
      api.contratoTexto != null && api.contratoTexto !== ''
        ? api.contratoTexto
        : local.contratoTexto,
    signatureConfig:
      api.signatureConfig !== undefined ? api.signatureConfig : local.signatureConfig,
  };
}

/** Alias para testes. */
export const mergeModeloAfterSaveForTest = mergeModeloAfterSave;

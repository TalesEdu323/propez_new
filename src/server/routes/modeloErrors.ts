/** Mapeamento de erros Postgres/API para respostas de save de modelo. */
export function modeloErrorResponse(err: unknown): { status: number; error: string } {
  const pg = err as { code?: string };
  if (pg.code === '23503') {
    return {
      status: 400,
      error: 'Contrato ou serviço vinculado não existe mais. Atualize o modelo e tente novamente.',
    };
  }
  if (pg.code === '42703') {
    return {
      status: 503,
      error: 'Banco de dados desatualizado. Contate o suporte para aplicar as migrações.',
    };
  }
  if (pg.code === '22P02') {
    return {
      status: 400,
      error: 'Dados do modelo em formato inválido. Recarregue a página e tente novamente.',
    };
  }
  return { status: 500, error: 'Erro ao salvar modelo. Tente novamente em alguns segundos.' };
}

export const MODELO_MAX_PAYLOAD_BYTES = 4_000_000;

export interface ContractCompanyContext {
  companyName: string | null;
  companyCnpj: string | null;
}

/** Converte placeholders legados da IA para o formato Propez. */
export function normalizeContractPlaceholders(texto: string): string {
  return texto
    .replace(/\[NOME\s+CONTRATADA\]/gi, '{{EMPRESA_NOME}}')
    .replace(/\[CNPJ\s+CONTRATADA\]/gi, '{{EMPRESA_CNPJ}}')
    .replace(/\[NOME\s+CONTRATANTE\]/gi, '{{CLIENTE_NOME}}')
    .replace(/\[CNPJ\s+CONTRATANTE\]/gi, '{{CLIENTE_EMPRESA}}')
    .replace(/\[NOME\s+DO\s+CLIENTE\]/gi, '{{CLIENTE_NOME}}')
    .replace(/\[EMPRESA\s+DO\s+CLIENTE\]/gi, '{{CLIENTE_EMPRESA}}');
}

export function buildContractSystemPrompt(): string {
  return `Você redige rascunhos de contratos de prestação de serviços em português (Brasil).
Responda SOMENTE com JSON válido: { "titulo": "...", "texto": "..." }

Regras:
- titulo: nome curto do modelo (max 200 chars)
- texto: contrato completo em texto plano (não HTML), com cláusulas numeradas
- Qualificação das partes usando EXATAMENTE estes placeholders (não invente outros):
  - CONTRATANTE (cliente): {{CLIENTE_NOME}}, {{CLIENTE_EMPRESA}}
  - CONTRATADA (prestadora / empresa Propez): {{EMPRESA_NOME}}, {{EMPRESA_CNPJ}}
  - Valores e datas: {{VALOR_TOTAL}}, {{DATA_ATUAL}}, {{DATA_ENVIO}}, {{DATA_VALIDADE}}, {{SERVICOS_LISTA}}
- NÃO substitua placeholders por nomes ou CNPJs literais; manten-os no texto para preenchimento automático depois
- Cláusulas: objeto, prazo, obrigações, pagamento, confidencialidade, rescisão, foro
- Tom formal mas claro; não cite leis específicas sem necessidade
- Valores e prazos conforme a descrição do usuário; use placeholders se não informados
- texto entre 800 e 6000 caracteres`;
}

export function buildContractUserPrompt(
  prompt: string,
  company?: ContractCompanyContext | null,
): string {
  const parts = [
    `Redija um rascunho de contrato de prestação de serviços com base nesta descrição:\n\n${prompt.trim()}`,
  ];

  if (company?.companyName?.trim() || company?.companyCnpj?.trim()) {
    const nome = company.companyName?.trim() || '(não informado)';
    const cnpj = company.companyCnpj?.trim() || '(não informado)';
    parts.push(
      '',
      'Dados da CONTRATADA (empresa do usuário Propez — referência para redação; NÃO escreva estes valores no lugar dos placeholders):',
      `Nome: ${nome}`,
      `CNPJ: ${cnpj}`,
      'Na qualificação da CONTRATADA, use exatamente os placeholders {{EMPRESA_NOME}} e {{EMPRESA_CNPJ}}.',
    );
  }

  return parts.join('\n');
}

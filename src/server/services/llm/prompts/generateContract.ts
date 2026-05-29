export function buildContractSystemPrompt(): string {
  return `Você redige rascunhos de contratos de prestação de serviços em português (Brasil).
Responda SOMENTE com JSON válido: { "titulo": "...", "texto": "..." }

Regras:
- titulo: nome curto do modelo (max 200 chars)
- texto: contrato completo em texto plano (não HTML), com cláusulas numeradas
- Inclua: qualificação das partes com placeholders [NOME CONTRATANTE], [CNPJ CONTRATANTE], [NOME CONTRATADA], [CNPJ CONTRATADA]
- Cláusulas: objeto, prazo, obrigações, pagamento, confidencialidade, rescisão, foro
- Tom formal mas claro; não cite leis específicas sem necessidade
- Valores e prazos conforme a descrição do usuário; use placeholders se não informados
- texto entre 800 e 6000 caracteres`;
}

export function buildContractUserPrompt(prompt: string): string {
  return `Redija um rascunho de contrato de prestação de serviços com base nesta descrição:\n\n${prompt.trim()}`;
}

import type { PoolClient } from 'pg'

/**
 * Cria o contrato padrão, alguns serviços de exemplo e modelos iniciais
 * para uma organização recém-criada. Chamado dentro do register (transação).
 */
export async function seedOrgDefaults(
  client: PoolClient,
  orgId: string,
): Promise<void> {
  const contractRes = await client.query<{ id: string }>(
    `INSERT INTO contratos_templates (organization_id, titulo, texto)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [
      orgId,
      'Contrato de Prestação de Serviços',
      `INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS

CONTRATADA: {{EMPRESA_NOME}} (CNPJ: {{EMPRESA_CNPJ}})
CONTRATANTE: {{CLIENTE_NOME}}

1. OBJETO
O presente contrato tem como objeto a prestação de serviços de {{SERVICOS_LISTA}}.

2. VALOR E PAGAMENTO
O valor total dos serviços é de {{VALOR_TOTAL}}.

3. PRAZO
A validade desta proposta é até {{DATA_VALIDADE}}.

Data: {{DATA_ATUAL}}

Assinatura CONTRATADA:
{{ASSINATURA_IMAGEM}}`,
    ],
  )
  const contratoId = contractRes.rows[0].id

  const servicoRes = await client.query<{ id: string }>(
    `INSERT INTO servicos (organization_id, nome, descricao, valor_cents, tipo, contrato_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      orgId,
      'Consultoria',
      'Sessões de consultoria estratégica personalizadas.',
      150000,
      'unico',
      contratoId,
    ],
  )
  const servicoConsultoriaId = servicoRes.rows[0].id

  await client.query(
    `INSERT INTO modelos_propostas (organization_id, nome, elementos, servicos, contrato_id, tier)
     VALUES
       ($1, $2, $3::jsonb, $4::uuid[], $5, $6),
       ($1, $7, $8::jsonb, $9::uuid[], $5, $10)`,
    [
      orgId,
      'Proposta de Serviço (Simples)',
      JSON.stringify([
        {
          id: 'h1',
          type: 'heading',
          props: {
            text: 'Proposta de Prestação de Serviços',
            align: 'center',
            size: 'text-5xl',
          },
        },
        {
          id: 'p1',
          type: 'paragraph',
          props: {
            text: 'Apresentamos nossa solução personalizada para atender às suas necessidades de negócio.',
            align: 'center',
          },
        },
      ]),
      [servicoConsultoriaId],
      contratoId,
      'free',
      'Proposta Profissional (Pro)',
      JSON.stringify([
        {
          id: 'nav1',
          type: 'navbar',
          props: {
            logoText: 'Sua Marca',
            links: ['Sobre', 'Portfólio', 'Contato'],
            buttonText: 'Falar com Especialista',
          },
        },
        {
          id: 'pricing1',
          type: 'pricing',
          props: {
            title: 'Investimento',
            price: '3.500',
            period: 'único',
            items: ['Entrega rápida', 'Suporte pós-venda', 'Revisões inclusas'],
          },
        },
      ]),
      [servicoConsultoriaId],
      'pro',
    ],
  )
}

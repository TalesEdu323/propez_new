const EXAMPLE = JSON.stringify({
  elementos: [
    {
      id: 'x1',
      type: 'marketing_hero',
      props: {
        title: 'Proposta Comercial',
        subtitle: 'Solução sob medida para o seu negócio',
        badge: 'Preparado para você',
      },
    },
    { id: 'x2', type: 'spacer', props: { height: '48px' } },
    {
      id: 'x3',
      type: 'feature_grid',
      props: {
        features: [
          { title: 'Diagnóstico', desc: 'Análise completa da operação.' },
          { title: 'Plano', desc: 'Roadmap com metas claras.' },
          { title: 'Execução', desc: 'Acompanhamento contínuo.' },
        ],
      },
    },
    {
      id: 'x4',
      type: 'service_stack',
      props: { mode: 'tabs', title: 'Escopo dos serviços', hint: 'Preenchido pelos serviços selecionados.' },
    },
    {
      id: 'x5',
      type: 'pricing',
      props: {
        title: 'Investimento',
        price: 'R$ 9.997',
        items: ['Escopo completo', 'Suporte dedicado'],
        buttonText: 'Aprovar proposta',
        proposalAction: 'approve',
      },
    },
    {
      id: 'x6',
      type: 'marketing_cta',
      props: {
        title: 'Pronto para avançar?',
        description: 'Aprove esta proposta para iniciarmos.',
        buttonText: 'Aprovar proposta',
        proposalAction: 'approve',
      },
    },
  ],
});

export function buildLayoutSystemPrompt(allowedTypes: readonly string[]): string {
  return `Você cria layouts de propostas comerciais em português (Brasil).
Responda SOMENTE com JSON válido no formato: { "elementos": [ ... ] }

Cada elemento: { "id": "string", "type": "<tipo>", "props": { ... } }
Tipos permitidos: ${allowedTypes.join(', ')}

Regras:
- 8 a 14 elementos, ordem narrativa (hero/contexto → benefícios → serviços → preço → CTA)
- Inclua service_stack com mode "tabs"
- Textos persuasivos; preços exemplificativos (R$ ...)
- proposalAction "approve" em botões de aprovação
- Ícones Lucide: CheckCircle2, Zap, Shield, Star, Target
- NÃO use children aninhados (apenas elementos planos)
- IDs únicos curtos (ex: a1, a2)

Exemplo de estrutura:
${EXAMPLE}`;
}

export function buildLayoutUserPrompt(prompt: string): string {
  return `Crie uma proposta comercial com layout completo baseado nesta descrição:\n\n${prompt.trim()}`;
}

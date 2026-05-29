import type { BuilderElement } from '../types/builder';
import { createId } from './ids';
import { formatBRL } from './format';
import type { Servico } from './store';

/**
 * Layout inicial ao criar/editar serviço — título, descrição e investimento.
 */
export function buildDefaultServicoLayout(servico: Pick<Servico, 'nome' | 'descricao' | 'valor' | 'tipo'>): BuilderElement[] {
  const priceLabel = formatBRL(servico.valor, { fractionDigits: 2 });
  const period = servico.tipo === 'recorrente' ? '/mês' : '';

  return [
    {
      id: createId(),
      type: 'container',
      props: { padding: '16', margin: '0', bgColor: 'transparent', radius: 'rounded-none', shadow: 'shadow-none', align: 'left' },
      children: [
        {
          id: createId(),
          type: 'heading',
          props: {
            text: servico.nome || 'Nome do serviço',
            color: '#0a0a0a',
            align: 'left',
            size: 'text-4xl',
            weight: 'font-bold',
          },
        },
        {
          id: createId(),
          type: 'paragraph',
          props: {
            text: servico.descricao || 'Descreva o escopo, entregas e diferenciais deste serviço.',
            color: '#52525b',
            align: 'left',
            size: 'text-lg',
          },
        },
        {
          id: createId(),
          type: 'feature_grid',
          props: {
            columns: '3',
            features: [
              { title: 'Entrega 1', desc: 'Detalhe a primeira entrega', icon: 'Zap' },
              { title: 'Entrega 2', desc: 'Detalhe a segunda entrega', icon: 'Target' },
              { title: 'Entrega 3', desc: 'Detalhe a terceira entrega', icon: 'Shield' },
            ],
            bgColor: '#ffffff',
          },
        },
        {
          id: createId(),
          type: 'pricing',
          props: {
            title: 'Investimento',
            price: priceLabel.replace('R$', 'R$ ').trim(),
            period,
            listIcon: 'CheckCircle2',
            items: ['Escopo conforme descrito acima', 'Suporte durante a execução'],
            buttonText: '',
            buttonColor: '#18181b',
            bgColor: '#fafafa',
          },
        },
      ],
    },
  ];
}

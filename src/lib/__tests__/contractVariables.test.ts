import { describe, it, expect } from 'vitest';
import {
  replaceContractString,
  replaceVariablesInElements,
  type ContractContext,
} from '../contractVariables';
import type { BuilderElement } from '../../types/builder';

const baseContext: ContractContext = {
  clienteNome: 'João da Silva',
  clienteEmail: 'joao@example.com',
  clienteEmpresa: 'Acme LTDA',
  valor: 1500,
  desconto: 150,
  empresaNome: 'Propez',
  empresaCnpj: '00.000.000/0001-00',
  servicosNomes: ['Consultoria', 'Implementação'],
};

describe('replaceContractString', () => {
  it('substitui {{cliente_nome}} (case-insensitive)', () => {
    expect(replaceContractString('Olá {{cliente_nome}}', baseContext)).toBe('Olá João da Silva');
    expect(replaceContractString('Olá {{CLIENTE_NOME}}', baseContext)).toBe('Olá João da Silva');
  });

  it('formata {{valor_total}} em BRL', () => {
    const out = replaceContractString('Total: {{valor_total}}', baseContext);
    expect(out).toContain('R$');
    expect(out).toContain('1.500');
  });

  it('junta {{servicos_lista}} com vírgula', () => {
    expect(replaceContractString('{{servicos_lista}}', baseContext)).toBe(
      'Consultoria, Implementação',
    );
  });

  it('usa fallback quando contexto está vazio', () => {
    expect(replaceContractString('{{cliente_nome}}', {})).toBe('[Nome do Cliente]');
    expect(replaceContractString('{{empresa_nome}}', {})).toBe('[Sua Empresa]');
  });

  it('substitui {{data_atual}} por data formatada pt-BR', () => {
    const out = replaceContractString('{{data_atual}}', {});
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('preserva strings não-template', () => {
    expect(replaceContractString('Texto comum sem placeholders', baseContext)).toBe(
      'Texto comum sem placeholders',
    );
  });

  it('retorna a entrada inalterada se não for string', () => {
    expect(replaceContractString(123 as unknown as string, baseContext)).toBe(123);
  });
});

describe('replaceVariablesInElements', () => {
  it('aplica substituição em props string e desce pelos children', () => {
    const elements: BuilderElement[] = [
      {
        id: 'root',
        type: 'container',
        props: { title: 'Cliente: {{cliente_nome}}' },
        children: [
          {
            id: 'child-1',
            type: 'paragraph',
            props: { text: 'Total {{valor_total}}', ignored: 42 },
          },
        ],
      },
    ];

    const out = replaceVariablesInElements(elements, baseContext);

    expect(out[0].props.title).toBe('Cliente: João da Silva');
    const child = out[0].children?.[0];
    expect(child).toBeDefined();
    expect(child!.props.text).toContain('R$');
    expect(child!.props.ignored).toBe(42);
  });

  it('não muta a árvore original', () => {
    const elements: BuilderElement[] = [
      { id: 'a', type: 'heading', props: { text: '{{cliente_nome}}' } },
    ];
    const out = replaceVariablesInElements(elements, baseContext);
    expect(out).not.toBe(elements);
    expect(elements[0].props.text).toBe('{{cliente_nome}}');
    expect(out[0].props.text).toBe('João da Silva');
  });
});

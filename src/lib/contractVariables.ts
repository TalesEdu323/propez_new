/**
 * Substituição das variáveis `{{...}}` usadas em contratos e textos de proposta.
 *
 * Compartilhado entre o fluxo de criação (PropezFluido) e a visualização
 * pública da proposta, evitando divergência de placeholders entre telas.
 */

import { formatBRL, formatDateBR } from './format';
import type { BuilderElement } from '../types/builder';

export interface ContractContext {
  clienteNome?: string;
  clienteEmail?: string;
  clienteEmpresa?: string;
  valor?: number | string;
  desconto?: number | string;
  dataEnvio?: string | Date;
  dataValidade?: string | Date;
  servicosNomes?: string[];
  empresaNome?: string;
  empresaCnpj?: string;
  assinaturaImagem?: string;
}

function value(context: ContractContext, key: keyof ContractContext, fallback: string): string {
  const raw = context[key];
  if (raw === undefined || raw === null || raw === '') return fallback;
  return String(raw);
}

export function replaceContractString(input: string, context: ContractContext): string {
  if (typeof input !== 'string') return input;

  const servicos = (context.servicosNomes ?? []).filter(Boolean).join(', ');
  const valorFormatado = formatBRL(context.valor ?? 0);
  const descontoFormatado = formatBRL(context.desconto ?? 0);
  const dataEnvio = context.dataEnvio ? formatDateBR(context.dataEnvio) : '';
  const dataValidade = context.dataValidade ? formatDateBR(context.dataValidade) : '';
  const dataAtual = formatDateBR(new Date());
  const assinatura = context.assinaturaImagem
    ? `<img src="${context.assinaturaImagem}" style="max-height: 80px;" />`
    : '[Assinatura]';

  return input
    .replace(/\{\{cliente_nome\}\}/gi, value(context, 'clienteNome', '[Nome do Cliente]'))
    .replace(/\{\{CLIENTE_NOME\}\}/g, value(context, 'clienteNome', '[Nome do Cliente]'))
    .replace(/\{\{cliente_email\}\}/gi, value(context, 'clienteEmail', '[E-mail do Cliente]'))
    .replace(/\{\{cliente_empresa\}\}/gi, value(context, 'clienteEmpresa', '[Empresa do Cliente]'))
    .replace(/\{\{CLIENTE_EMPRESA\}\}/g, value(context, 'clienteEmpresa', '[Empresa do Cliente]'))
    .replace(/\{\{valor_total\}\}/gi, valorFormatado)
    .replace(/\{\{VALOR_TOTAL\}\}/g, valorFormatado)
    .replace(/\{\{desconto\}\}/gi, descontoFormatado)
    .replace(/\{\{data_envio\}\}/gi, dataEnvio)
    .replace(/\{\{DATA_ENVIO\}\}/g, dataEnvio)
    .replace(/\{\{data_validade\}\}/gi, dataValidade)
    .replace(/\{\{DATA_VALIDADE\}\}/g, dataValidade)
    .replace(/\{\{data_atual\}\}/gi, dataAtual)
    .replace(/\{\{DATA_ATUAL\}\}/g, dataAtual)
    .replace(/\{\{servicos_lista\}\}/gi, servicos || '[Lista de Serviços]')
    .replace(/\{\{SERVICOS_LISTA\}\}/g, servicos || '[Lista de Serviços]')
    .replace(/\{\{empresa_nome\}\}/gi, value(context, 'empresaNome', '[Sua Empresa]'))
    .replace(/\{\{EMPRESA_NOME\}\}/g, value(context, 'empresaNome', '[Sua Empresa]'))
    .replace(/\{\{empresa_cnpj\}\}/gi, value(context, 'empresaCnpj', '[Seu CNPJ]'))
    .replace(/\{\{EMPRESA_CNPJ\}\}/g, value(context, 'empresaCnpj', '[Seu CNPJ]'))
    .replace(/\{\{ASSINATURA_IMAGEM\}\}/g, assinatura)
    .replace(/\{\{assinatura_imagem\}\}/gi, assinatura);
}

export function replaceVariablesInElements(elements: BuilderElement[], context: ContractContext): BuilderElement[] {
  const process = (list: BuilderElement[]): BuilderElement[] =>
    list.map(element => {
      const originalProps = element.props || {};
      const nextProps: Record<string, unknown> = { ...originalProps };
      for (const key of Object.keys(nextProps)) {
        const val = nextProps[key];
        if (typeof val === 'string') {
          nextProps[key] = replaceContractString(val, context);
        }
      }
      return {
        ...element,
        props: nextProps,
        children: element.children ? process(element.children) : element.children,
      };
    });

  return process(elements);
}

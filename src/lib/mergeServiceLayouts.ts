import type { BuilderElement } from '../types/builder';
import type { Servico } from './store';
import { createId } from './ids';
import { formatBRL } from './format';
import { buildDefaultServicoLayout } from './servicoDefaultLayout';

export type ServiceStackMode = 'tabs' | 'stack';

export interface MergeServiceLayoutsOptions {
  mode?: ServiceStackMode;
}

const MERGE_TAG = '_serviceMerge';

function tagMerged(elements: BuilderElement[]): BuilderElement[] {
  return elements.map((el) => ({
    ...el,
    props: { ...el.props, [MERGE_TAG]: true },
  }));
}

function stripMergedBlocks(elementos: BuilderElement[]): BuilderElement[] {
  return elementos.filter((el) => !el.props?.[MERGE_TAG]);
}

function cloneElements(elements: BuilderElement[]): BuilderElement[] {
  return JSON.parse(JSON.stringify(elements)).map((el: BuilderElement) => ({
    ...el,
    id: createId(),
    children: el.children?.map((c) => ({ ...c, id: createId() })),
  }));
}

function injectServicoPricing(elements: BuilderElement[], servico: Servico): BuilderElement[] {
  const priceStr = formatBRL(servico.valor);
  const period = servico.tipo === 'recorrente' ? '/mês' : '';

  return elements.map((el) => {
    if (el.type === 'pricing' || el.type === 'marketing_pricing') {
      return {
        ...el,
        props: {
          ...el.props,
          price: priceStr.replace(/\s/g, ' ').trim(),
          ...(el.type === 'pricing' ? { period } : {}),
        },
      };
    }
    return el;
  });
}

function servicoElementsFor(servico: Servico): BuilderElement[] {
  const base =
    servico.elementos && servico.elementos.length > 0
      ? servico.elementos
      : buildDefaultServicoLayout(servico);
  return injectServicoPricing(cloneElements(base), servico);
}

function elementsToTabContent(elements: BuilderElement[]): string {
  return elements
    .map((el) => {
      if (el.type === 'heading') return `## ${el.props.text ?? ''}`;
      if (el.type === 'paragraph') return String(el.props.text ?? '');
      if (el.type === 'feature_grid' && Array.isArray(el.props.items)) {
        return (el.props.items as { title?: string; desc?: string }[])
          .map((i) => `• ${i.title ?? ''}: ${i.desc ?? ''}`)
          .join('\n');
      }
      if (el.type === 'icon_list' && Array.isArray(el.props.items)) {
        return (el.props.items as string[]).map((i) => `• ${i}`).join('\n');
      }
      if (el.type === 'pricing' || el.type === 'marketing_pricing') {
        return `Investimento: ${el.props.price ?? ''}${el.props.period ?? ''}`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

function buildTabsBlock(servicos: Servico[], title?: string): BuilderElement {
  return {
    id: createId(),
    type: 'tabs',
    props: {
      title,
      activeColor: '#18181b',
      bgColor: '#ffffff',
      tabs: servicos.map((s) => ({
        title: s.nome,
        content: elementsToTabContent(servicoElementsFor(s)),
      })),
    },
  };
}

function buildStackBlocks(servicos: Servico[]): BuilderElement[] {
  const out: BuilderElement[] = [];
  for (const s of servicos) {
    out.push({
      id: createId(),
      type: 'heading',
      props: {
        text: s.nome,
        color: '#0a0a0a',
        align: 'left',
        size: 'text-3xl',
        weight: 'font-bold',
      },
    });
    out.push(...servicoElementsFor(s));
    out.push({
      id: createId(),
      type: 'divider',
      props: { color: '#e4e4e7', thickness: '1px', margin: '48px' },
    });
  }
  return out;
}

function resolveMode(elementos: BuilderElement[], override?: ServiceStackMode): ServiceStackMode {
  const anchor = elementos.find((el) => el.type === 'service_stack');
  const mode = (anchor?.props?.mode as ServiceStackMode) ?? override ?? 'tabs';
  return mode === 'stack' ? 'stack' : 'tabs';
}

/**
 * Substitui o marcador `service_stack` (ou insere antes do último CTA) pelo layout dos serviços.
 */
export function mergeServiceLayouts(
  modeloElementos: BuilderElement[],
  servicoIds: string[],
  catalog: Servico[],
  options: MergeServiceLayoutsOptions = {},
): BuilderElement[] {
  const base = stripMergedBlocks(modeloElementos);

  if (!servicoIds.length) {
    return base;
  }

  const servicos = servicoIds
    .map((id) => catalog.find((s) => s.id === id))
    .filter((s): s is Servico => !!s);

  if (!servicos.length) {
    return base;
  }

  const mode = resolveMode(base, options.mode);
  const stackIdx = base.findIndex((el) => el.type === 'service_stack');
  const replacement = tagMerged(
    mode === 'tabs'
      ? [buildTabsBlock(servicos, String(base[stackIdx]?.props?.title ?? 'Serviços'))]
      : buildStackBlocks(servicos),
  );

  if (stackIdx >= 0) {
    return [...base.slice(0, stackIdx), ...replacement, ...base.slice(stackIdx + 1)];
  }

  const ctaIdx = base.findIndex(
    (el) =>
      el.type === 'marketing_cta' ||
      (el.type === 'button' && el.props.proposalAction === 'approve'),
  );
  if (ctaIdx >= 0) {
    return [...base.slice(0, ctaIdx), ...replacement, ...base.slice(ctaIdx)];
  }

  return [...base, ...replacement];
}

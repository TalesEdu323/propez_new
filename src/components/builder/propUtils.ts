/** Normaliza props legadas vs novas para renderização consistente. */

export interface StatItem {
  value: string;
  label: string;
  suffix?: string;
  color?: string;
}

export function normalizeStatsItems(props: Record<string, unknown>): StatItem[] {
  if (Array.isArray(props.items) && props.items.length > 0) {
    return (props.items as StatItem[]).map((item) => ({
      value: String(item.value ?? ''),
      label: String(item.label ?? ''),
      suffix: item.suffix ? String(item.suffix) : '',
      color: item.color ? String(item.color) : (props.color as string) ?? '#dc2626',
    }));
  }
  if (props.value != null) {
    return [{
      value: String(props.value),
      label: String(props.label ?? ''),
      suffix: props.suffix ? String(props.suffix) : '',
      color: (props.color as string) ?? '#dc2626',
    }];
  }
  return [];
}

export interface AccordionItem {
  title: string;
  content: string;
}

export function normalizeAccordionItems(props: Record<string, unknown>): AccordionItem[] {
  if (Array.isArray(props.items) && props.items.length > 0) {
    return (props.items as AccordionItem[]).map((item) => ({
      title: String(item.title ?? ''),
      content: String(item.content ?? ''),
    }));
  }
  if (props.title || props.content) {
    return [{
      title: String(props.title ?? 'Pergunta'),
      content: String(props.content ?? ''),
    }];
  }
  return [];
}

export interface StrategyStep {
  titulo: string;
  letra: string;
  desc: string;
}

export function normalizeStrategySteps(steps: unknown[]): StrategyStep[] {
  if (!Array.isArray(steps)) return [];
  return steps.map((raw, i) => {
    const step = raw as Record<string, unknown>;
    const titulo = String(step.titulo ?? step.title ?? `Etapa ${i + 1}`);
    const letra = String(step.letra ?? titulo.charAt(0).toUpperCase());
    return {
      titulo,
      letra,
      desc: String(step.desc ?? step.description ?? ''),
    };
  });
}

export interface ComparisonRow {
  feature: string;
  us: string;
  them: string;
}

export function normalizeComparisonTable(props: Record<string, unknown>): {
  headers: string[];
  rows: ComparisonRow[];
} {
  const headers = (props.headers as string[] | undefined)
    ?? (props.columns as string[] | undefined)
    ?? ['Recurso', 'Nós', 'Concorrente'];

  const rawRows = props.rows;
  if (!Array.isArray(rawRows)) return { headers, rows: [] };

  const rows: ComparisonRow[] = rawRows.map((raw) => {
    if (Array.isArray(raw)) {
      return {
        feature: String(raw[0] ?? ''),
        us: String(raw[1] ?? ''),
        them: String(raw[2] ?? ''),
      };
    }
    const row = raw as Record<string, unknown>;
    if (typeof row.us === 'boolean' || typeof row.them === 'boolean') {
      return {
        feature: String(row.feature ?? ''),
        us: row.us ? 'yes' : 'no',
        them: row.them ? 'yes' : 'no',
      };
    }
    return {
      feature: String(row.feature ?? row[0] ?? ''),
      us: String(row.us ?? row[1] ?? ''),
      them: String(row.them ?? row[2] ?? ''),
    };
  });

  const displayHeaders = headers.length >= 3
    ? headers
    : ['Recurso', headers[0] ?? 'Situação atual', headers[1] ?? 'Com nossa gestão'];

  return { headers: displayHeaders, rows };
}

export function normalizeContextDescription(props: Record<string, unknown>): string {
  if (props.description) return String(props.description);
  if (Array.isArray(props.paragraphs)) {
    return (props.paragraphs as string[]).join('\n\n');
  }
  return '';
}

export function normalizeHeroCopy(props: Record<string, unknown>): {
  badge: string;
  title: string;
  description: string;
  buttonText: string;
} {
  const badge = String(props.badge ?? props.subtitle ?? '');
  const hasBadge = Boolean(props.badge);
  const description = String(
    props.description
    ?? (hasBadge ? props.subtitle : '')
    ?? '',
  );
  return {
    badge: hasBadge ? badge : '',
    title: String(props.title ?? ''),
    description,
    buttonText: String(props.buttonText ?? 'Aprovar proposta'),
  };
}

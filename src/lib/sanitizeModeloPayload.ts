import type { BuilderElement, BuilderPageLayout } from '../types/builder';
import { normalizePageLayout } from './pageLayout';

/** Normaliza WhatsApp para dígitos (E.164 compacto), máx. 20 caracteres. */
export function sanitizeWhatsappComprovante(value: string | null | undefined): string | null {
  if (value == null) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  return digits.slice(0, 20);
}

/** Remove campos de pageLayout inválidos para a API (ex.: maxContentWidth <= 0). */
export function sanitizePageLayoutForApi(raw: BuilderPageLayout | null | undefined): BuilderPageLayout {
  const layout = normalizePageLayout(raw);
  const { maxContentWidth, ...rest } = layout;
  if (typeof maxContentWidth === 'number' && maxContentWidth > 0 && Number.isFinite(maxContentWidth)) {
    return { ...rest, maxContentWidth };
  }
  return rest;
}

const STRIP_PROPS = new Set(['imageGeneratePrompt', 'imageSearchQuery']);

function stripRecordProps(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (STRIP_PROPS.has(key)) continue;
    if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        typeof item === 'object' && item !== null && !Array.isArray(item)
          ? stripRecordProps(item as Record<string, unknown>)
          : item,
      );
    } else if (typeof value === 'object' && value !== null) {
      out[key] = stripRecordProps(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Remove metadados internos de IA antes de persistir no servidor. */
export function stripElementosForApi(elementos: BuilderElement[]): BuilderElement[] {
  return elementos.map((el) => {
    const next: BuilderElement = {
      ...el,
      props: stripRecordProps((el.props ?? {}) as Record<string, unknown>),
    };
    if (el.children?.length) {
      next.children = stripElementosForApi(el.children);
    }
    return next;
  });
}

/**
 * Quando há template de contrato (contratoId), não envia texto duplicado ao servidor.
 * O texto é resolvido via FK na criação de propostas.
 */
export function resolveContratoTextoForApi(
  contratoId: string | null | undefined,
  contratoTexto: string | null | undefined,
): string | null {
  if (contratoId) return null;
  if (contratoTexto == null || contratoTexto === '') return null;
  return contratoTexto;
}

/** Alerta se o payload de elementos for excessivamente grande (>500KB serializado). */
export function warnIfElementosPayloadLarge(elementos: BuilderElement[]): void {
  try {
    const size = JSON.stringify(elementos).length;
    if (size > 500_000) {
      console.warn(
        `[modelo] Payload de elementos muito grande (${Math.round(size / 1024)}KB). O salvamento pode demorar ou falhar.`,
      );
    }
  } catch {
    /* ignore */
  }
}

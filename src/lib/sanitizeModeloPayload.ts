import type { BuilderPageLayout } from '../types/builder';
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

import type { OfferType } from './layoutContext';

export const SEGMENT_OPTIONS: { value: OfferType; label: string }[] = [
  { value: 'consultoria', label: 'Consultoria / B2B' },
  { value: 'agencia', label: 'Agência / Marketing' },
  { value: 'saas', label: 'SaaS / Tecnologia' },
  { value: 'recorrente', label: 'Serviços recorrentes' },
  { value: 'evento', label: 'Eventos / Treinamentos' },
  { value: 'generico', label: 'Outro / Geral' },
];

export function getSegmentLabel(segment: OfferType | null | undefined): string {
  if (!segment) return 'Geral';
  return SEGMENT_OPTIONS.find((o) => o.value === segment)?.label ?? 'Geral';
}

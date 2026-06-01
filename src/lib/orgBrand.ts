import type { PlanTier } from './planConfig.js';
import type { UserConfig } from './planConfig.js';

export interface OrgBrandSource {
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  whitelabelEnabled?: boolean;
  name?: string;
  plan?: PlanTier;
}

export interface ResolvedOrgBrand {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  orgName: string;
  isWhiteLabel: boolean;
}

const DEFAULT_PRIMARY = '#18181b';
const DEFAULT_PRIMARY_HOVER = '#000000';

export function resolveOrgBrand(
  org: OrgBrandSource | null | undefined,
  config?: UserConfig | null,
): ResolvedOrgBrand {
  const isWhiteLabel =
    org?.whitelabelEnabled === true || config?.whitelabelEnabled === true;
  return {
    logoUrl: org?.logoUrl ?? config?.logo ?? null,
    primaryColor: org?.primaryColor ?? config?.primaryColor ?? null,
    secondaryColor: org?.secondaryColor ?? config?.secondaryColor ?? null,
    orgName: org?.name ?? config?.nome ?? '',
    isWhiteLabel,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Luminância relativa (0–1) para decidir contraste de texto em botões. */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function darkenHex(hex: string, amount = 0.12): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return DEFAULT_PRIMARY_HOVER;
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(f(rgb.r))}${toHex(f(rgb.g))}${toHex(f(rgb.b))}`;
}

export function applyOrgBrandCss(primaryColor: string | null | undefined): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primary = primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor)
    ? primaryColor
    : DEFAULT_PRIMARY;
  root.style.setProperty('--org-primary', primary);
  root.style.setProperty('--org-primary-hover', darkenHex(primary));
  root.style.setProperty('--org-accent', primary);
  root.style.setProperty(
    '--org-primary-text',
    relativeLuminance(primary) > 0.45 ? '#18181b' : '#ffffff',
  );
  root.classList.add('whitelabel');
}

export function clearOrgBrandCss(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.removeProperty('--org-primary');
  root.style.removeProperty('--org-primary-hover');
  root.style.removeProperty('--org-primary-text');
  root.style.removeProperty('--org-accent');
  root.classList.remove('whitelabel');
}

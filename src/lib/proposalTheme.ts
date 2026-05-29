import type { BuilderPageLayout } from '../types/builder';

export interface ProposalThemePreset {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
}

export const PROPOSAL_THEME_PRESETS: ProposalThemePreset[] = [
  {
    id: 'midnight-amber',
    name: 'Midnight Amber',
    primaryColor: '#B45309',
    secondaryColor: '#D97706',
    backgroundColor: '#fafafa',
    textColor: '#18181b',
  },
  {
    id: 'clean-corporate',
    name: 'Clean Corporate',
    primaryColor: '#2563eb',
    secondaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
  },
  {
    id: 'ocean-pro',
    name: 'Ocean Pro',
    primaryColor: '#0d9488',
    secondaryColor: '#14b8a6',
    backgroundColor: '#f0fdfa',
    textColor: '#134e4a',
  },
  {
    id: 'bold-red',
    name: 'Bold Red',
    primaryColor: '#dc2626',
    secondaryColor: '#ef4444',
    backgroundColor: '#fef2f2',
    textColor: '#18181b',
  },
  {
    id: 'navy-performance',
    name: 'Navy Performance',
    primaryColor: '#1a1a2e',
    secondaryColor: '#e94560',
    backgroundColor: '#f8fafc',
    textColor: '#1e293b',
  },
  {
    id: 'dark-premium',
    name: 'Dark Premium',
    primaryColor: '#B45309',
    secondaryColor: '#f59e0b',
    backgroundColor: '#0a0a0a',
    textColor: '#fafafa',
  },
  {
    id: 'forest-growth',
    name: 'Forest Growth',
    primaryColor: '#059669',
    secondaryColor: '#10b981',
    backgroundColor: '#f0fdf4',
    textColor: '#14532d',
  },
  {
    id: 'purple-creative',
    name: 'Purple Creative',
    primaryColor: '#7c3aed',
    secondaryColor: '#a78bfa',
    backgroundColor: '#faf5ff',
    textColor: '#3b0764',
  },
];

export function getThemePreset(id: string | undefined): ProposalThemePreset | undefined {
  return PROPOSAL_THEME_PRESETS.find((p) => p.id === id);
}

export function applyThemeToPageLayout(
  layout: BuilderPageLayout,
  presetId: string,
): BuilderPageLayout {
  const preset = getThemePreset(presetId);
  if (!preset) return layout;
  return {
    ...layout,
    themePreset: presetId,
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    backgroundColor: preset.backgroundColor,
    textColor: preset.textColor,
  };
}

export function resolveThemeColors(layout?: BuilderPageLayout | null) {
  const preset = getThemePreset(layout?.themePreset);
  return {
    primaryColor: layout?.primaryColor ?? preset?.primaryColor ?? '#B45309',
    secondaryColor: layout?.secondaryColor ?? preset?.secondaryColor ?? '#D97706',
    backgroundColor: layout?.backgroundColor ?? preset?.backgroundColor ?? '#ffffff',
    textColor: layout?.textColor ?? preset?.textColor ?? '#18181b',
    logoUrl: layout?.logoUrl,
  };
}

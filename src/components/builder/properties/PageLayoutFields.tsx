import { useState } from 'react';
import { ChevronDown, Image, Layout, Maximize2, Palette, Sparkles } from 'lucide-react';
import type { BuilderPageLayout } from '../../../types/builder';
import { PAGE_PADDING_PRESETS } from '../constants';
import { PROPOSAL_THEME_PRESETS, applyThemeToPageLayout, resolveThemeColors } from '../../../lib/proposalTheme';
import { ColorPickerRow } from './ColorPickerRow';

export interface PageLayoutFieldsProps {
  layout: BuilderPageLayout;
  onChange: (layout: BuilderPageLayout) => void;
}

const PAGE_COLOR_FIELDS: {
  key: keyof Pick<BuilderPageLayout, 'primaryColor' | 'secondaryColor' | 'backgroundColor' | 'textColor'>;
  label: string;
  hint: string;
}[] = [
  {
    key: 'primaryColor',
    label: 'Cor primária',
    hint: 'Botões, destaques e elementos de ação.',
  },
  {
    key: 'secondaryColor',
    label: 'Cor secundária',
    hint: 'Gradientes, bordas e detalhes complementares.',
  },
  {
    key: 'backgroundColor',
    label: 'Cor de fundo',
    hint: 'Fundo geral da proposta (atrás dos blocos).',
  },
  {
    key: 'textColor',
    label: 'Cor do texto',
    hint: 'Texto padrão quando o bloco não define outra cor.',
  },
];

export function PageLayoutFields({ layout, onChange }: PageLayoutFieldsProps) {
  const [structureOpen, setStructureOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const theme = resolveThemeColors(layout);
  const isBoxed = layout.widthMode === 'boxed';

  const setColor = (key: (typeof PAGE_COLOR_FIELDS)[number]['key'], hex: string) => {
    onChange({ ...layout, [key]: hex || undefined });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 mb-1 flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-zinc-500" />
          Cores da proposta
        </h3>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Defina cada cor manualmente, como em um construtor visual — sem depender de um tema fixo.
        </p>
      </div>

      <div className="space-y-4">
        {PAGE_COLOR_FIELDS.map(({ key, label, hint }) => (
          <ColorPickerRow
            key={key}
            label={label}
            hint={hint}
            value={layout[key] ?? theme[key]}
            onChange={(hex) => setColor(key, hex)}
          />
        ))}
      </div>

      <div className="rounded-xl border border-black/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setPresetsOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold text-zinc-600 bg-zinc-50/80 hover:bg-zinc-100/80 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            Paletas rápidas (opcional)
          </span>
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${presetsOpen ? 'rotate-180' : ''}`} />
        </button>
        {presetsOpen && (
          <div className="p-3 border-t border-black/5 bg-white">
            <p className="text-[10px] text-zinc-400 mb-2 leading-snug">
              Aplica um conjunto de cores de uma vez; você pode ajustar cada cor depois.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PROPOSAL_THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange(applyThemeToPageLayout(layout, preset.id))}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left ${layout.themePreset === preset.id ? 'border-blue-500 bg-blue-50/50' : 'border-black/5 hover:border-black/10'}`}
                >
                  <div className="flex gap-0.5 shrink-0">
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: preset.primaryColor }} />
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: preset.secondaryColor }} />
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: preset.backgroundColor }} />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-700 leading-tight truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 pt-2 border-t border-black/5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          <Image className="w-3.5 h-3.5" /> Mídia
        </div>
        <div>
          <label className="block text-[11px] font-medium text-zinc-600 mb-1.5">Logo (URL)</label>
          <input
            type="text"
            value={layout.logoUrl ?? ''}
            onChange={(e) => onChange({ ...layout, logoUrl: e.target.value || undefined })}
            placeholder="https://..."
            className="glass-input text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-zinc-600 mb-1.5">Imagem de fundo (URL)</label>
          <input
            type="text"
            value={layout.backgroundImage ?? ''}
            onChange={(e) => onChange({ ...layout, backgroundImage: e.target.value || undefined })}
            placeholder="Opcional"
            className="glass-input text-sm"
          />
        </div>
      </div>

      <div className="rounded-xl border border-black/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setStructureOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold text-zinc-600 bg-zinc-50/80 hover:bg-zinc-100/80 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Layout className="w-3.5 h-3.5 text-zinc-400" />
            Estrutura da página (opcional)
          </span>
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${structureOpen ? 'rotate-180' : ''}`} />
        </button>
        {structureOpen && (
          <div className="p-3 border-t border-black/5 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...layout, widthMode: 'boxed' })}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${isBoxed ? 'border-blue-500 bg-blue-50/50' : 'border-black/5 hover:border-black/10'}`}
              >
                <Layout className={`w-5 h-5 ${isBoxed ? 'text-blue-600' : 'text-zinc-400'}`} />
                <span className="text-[11px] font-semibold text-zinc-800">Com margens</span>
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...layout, widthMode: 'full' })}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${!isBoxed ? 'border-blue-500 bg-blue-50/50' : 'border-black/5 hover:border-black/10'}`}
              >
                <Maximize2 className={`w-5 h-5 ${!isBoxed ? 'text-blue-600' : 'text-zinc-400'}`} />
                <span className="text-[11px] font-semibold text-zinc-800">Tela inteira</span>
              </button>
            </div>
            {isBoxed && (
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 mb-2">Margem lateral</label>
                <div className="flex gap-2">
                  {PAGE_PADDING_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => onChange({ ...layout, horizontalPadding: preset.value })}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${layout.horizontalPadding === preset.value ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-black/10 text-zinc-600 hover:border-black/20'}`}
                    >
                      {preset.label}
                      <span className="block text-[10px] font-normal opacity-70">{preset.value}px</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

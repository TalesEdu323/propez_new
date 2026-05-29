import { Layout, Maximize2, Palette } from 'lucide-react';
import type { BuilderPageLayout } from '../../../types/builder';
import { PAGE_PADDING_PRESETS } from '../constants';
import { PROPOSAL_THEME_PRESETS, applyThemeToPageLayout } from '../../../lib/proposalTheme';

export interface PageLayoutFieldsProps {
  layout: BuilderPageLayout;
  onChange: (layout: BuilderPageLayout) => void;
}

export function PageLayoutFields({ layout, onChange }: PageLayoutFieldsProps) {
  const isBoxed = layout.widthMode === 'boxed';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 mb-1">Layout da página</h3>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Define margens, tema visual e fundo da proposta.
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" /> Tema visual
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PROPOSAL_THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(applyThemeToPageLayout(layout, preset.id))}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${layout.themePreset === preset.id ? 'border-blue-500 bg-blue-50/50' : 'border-black/5 hover:border-black/10'}`}
            >
              <div className="flex gap-1 shrink-0">
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.primaryColor }} />
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.secondaryColor }} />
              </div>
              <span className="text-[11px] font-semibold text-zinc-700 leading-tight">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Logo da proposta (URL)
        </label>
        <input
          type="text"
          value={layout.logoUrl ?? ''}
          onChange={(e) => onChange({ ...layout, logoUrl: e.target.value || undefined })}
          placeholder="https://..."
          className="glass-input text-sm"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Imagem de fundo (URL)
        </label>
        <input
          type="text"
          value={layout.backgroundImage ?? ''}
          onChange={(e) => onChange({ ...layout, backgroundImage: e.target.value || undefined })}
          placeholder="Opcional — URL de imagem"
          className="glass-input text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...layout, widthMode: 'boxed' })}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${isBoxed ? 'border-blue-500 bg-blue-50/50' : 'border-black/5 hover:border-black/10'}`}
        >
          <Layout className={`w-6 h-6 ${isBoxed ? 'text-blue-600' : 'text-zinc-400'}`} />
          <span className="text-xs font-semibold text-zinc-800">Com margens</span>
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...layout, widthMode: 'full' })}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${!isBoxed ? 'border-blue-500 bg-blue-50/50' : 'border-black/5 hover:border-black/10'}`}
        >
          <Maximize2 className={`w-6 h-6 ${!isBoxed ? 'text-blue-600' : 'text-zinc-400'}`} />
          <span className="text-xs font-semibold text-zinc-800">Tela inteira</span>
        </button>
      </div>

      {isBoxed && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Margem lateral
          </label>
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
  );
}

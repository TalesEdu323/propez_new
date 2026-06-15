import type { SpacingPreset } from '../../../types/builder';
import { SPACING_PRESET_VALUES, spacingPresetFromProps } from '../constants';
import type { FieldProps } from './TextFields';

const PRESET_LABELS: Record<SpacingPreset, string> = {
  compact: 'Compacto',
  normal: 'Padrão',
  spacious: 'Amplo',
};

const STRUCTURAL_TYPES = new Set(['grid', 'container', 'column']);

export function SpacingSection({
  element,
  updateElement,
  pageHorizontalPadding = 60,
  showMarginAdvanced = true,
}: FieldProps & { pageHorizontalPadding?: number; showMarginAdvanced?: boolean }) {
  if (!STRUCTURAL_TYPES.has(element.type)) return null;
  const { props, id } = element;
  if (!('padding' in props)) return null;

  const preset = spacingPresetFromProps(
    props.padding as string | undefined,
    props.margin as string | undefined,
  );
  const paddingNum = parseInt(String(props.padding ?? '16'), 10);
  const showDoubleWarning = pageHorizontalPadding >= 48 && paddingNum >= 48;

  const applyPreset = (p: SpacingPreset) => {
    const v = SPACING_PRESET_VALUES[p];
    updateElement(id, { padding: v.padding, margin: v.margin, spacingPreset: p });
  };

  return (
    <div className="space-y-4 pt-2 border-t border-black/5">
      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Espaço do bloco
        </label>
        <div className="flex bg-zinc-100 rounded-xl p-1 border border-black/5">
          {(Object.keys(PRESET_LABELS) as SpacingPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => applyPreset(p)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${preset === p ? 'bg-white shadow-sm border border-black/5 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-zinc-400 mt-1.5">Espaço dentro do bloco (padding)</p>
      </div>

      {showDoubleWarning && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Margem da página + bloco amplo podem deixar o conteúdo estreito no celular.
        </p>
      )}

      {showMarginAdvanced && (
        <details className="group">
          <summary className="text-xs font-semibold text-zinc-500 cursor-pointer hover:text-zinc-800">
            Ajuste fino
          </summary>
          <div className="mt-3 space-y-3 pl-1">
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">
                Espaço dentro (px)
              </label>
              <input
                type="number"
                min={0}
                max={80}
                value={props.padding}
                onChange={(e) => updateElement(id, { padding: e.target.value })}
                className="glass-input"
              />
            </div>
            {'margin' in props && (
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">
                  Espaço fora (px)
                </label>
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={props.margin ?? '0'}
                  onChange={(e) => updateElement(id, { margin: e.target.value })}
                  className="glass-input"
                />
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

import type { FieldProps } from './TextFields';

const MARKETING_TYPES = new Set([
  'marketing_context',
  'marketing_strategy',
  'marketing_pricing',
  'marketing_cta',
  'tabs',
  'funnel',
]);

export function MarketingVisualFields({ element, updateElement }: FieldProps) {
  const { type, props, id } = element;

  return (
    <>
      {MARKETING_TYPES.has(type) && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Rótulo da seção
          </label>
          <input
            type="text"
            value={String(props.sectionLabel ?? '')}
            onChange={(e) => updateElement(id, { sectionLabel: e.target.value })}
            placeholder="Ex.: 01 · Contexto"
            className="glass-input"
          />
        </div>
      )}

      {type === 'marketing_hero' && (
        <>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Texto do 2º botão
            </label>
            <input
              type="text"
              value={String(props.secondaryButtonText ?? '')}
              onChange={(e) => updateElement(id, { secondaryButtonText: e.target.value })}
              placeholder="Ex.: Ver escopo completo"
              className="glass-input"
            />
          </div>
          {'secondaryButtonText' in props && String(props.secondaryButtonText ?? '').trim() ? (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Ação do 2º botão
              </label>
              <select
                value={String(props.secondaryButtonAction ?? 'none')}
                onChange={(e) => updateElement(id, { secondaryButtonAction: e.target.value })}
                className="glass-input appearance-none cursor-pointer"
              >
                <option value="none">Nenhuma (scroll/visual)</option>
                <option value="approve">Aprovar proposta</option>
              </select>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Overlay de pontos no banner
            </label>
            <button
              type="button"
              onClick={() => updateElement(id, { dotOverlay: !props.dotOverlay })}
              className={`relative w-11 h-6 rounded-full transition-colors ${props.dotOverlay ? 'bg-zinc-900' : 'bg-zinc-200'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${props.dotOverlay ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>
        </>
      )}
    </>
  );
}

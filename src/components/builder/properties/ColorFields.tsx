import type { FieldProps } from './TextFields';

const COLOR_KEYS = ['color', 'bgColor', 'textColor', 'iconColor', 'buttonColor', 'labelColor', 'activeColor'] as const;

const COLOR_LABELS: Record<string, string> = {
  color: 'Cor Principal',
  bgColor: 'Cor de Fundo',
  iconColor: 'Cor do Ícone',
  buttonColor: 'Cor do Botão',
  labelColor: 'Cor do Rótulo',
  activeColor: 'Cor Ativa',
  textColor: 'Cor do Texto',
};

export function ColorFields({ element, updateElement }: FieldProps) {
  const { props, id } = element;
  return (
    <>
      {COLOR_KEYS.map(propKey => (
        propKey in props && (
          <div key={propKey}>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              {COLOR_LABELS[propKey] ?? 'Cor do Texto'}
            </label>
            <div className="flex items-center gap-3 bg-white border border-black/10 rounded-xl p-2">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-black/10 shadow-sm shrink-0">
                <input
                  type="color"
                  value={props[propKey]}
                  onChange={(e) => updateElement(id, { [propKey]: e.target.value })}
                  className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                />
              </div>
              <input
                type="text"
                value={props[propKey]}
                onChange={(e) => updateElement(id, { [propKey]: e.target.value })}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-mono uppercase text-zinc-700 p-0"
              />
            </div>
          </div>
        )
      ))}
    </>
  );
}

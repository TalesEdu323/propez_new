export interface ColorPickerRowProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (hex: string) => void;
}

export function ColorPickerRow({ label, hint, value, onChange }: ColorPickerRowProps) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#000000';

  return (
    <div>
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      {hint && <p className="text-[10px] text-zinc-400 mb-2 leading-snug">{hint}</p>}
      <div className="flex items-center gap-3 bg-white border border-black/10 rounded-xl p-2">
        <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-black/10 shadow-sm shrink-0">
          <input
            type="color"
            value={safe}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -top-2 -left-2 w-14 h-14 cursor-pointer"
            aria-label={label}
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-mono uppercase text-zinc-700 p-0 min-w-0"
        />
      </div>
    </div>
  );
}

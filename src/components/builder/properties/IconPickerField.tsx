import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { BuilderIcon } from '../icons/BuilderIcon';
import {
  BUILDER_ICON_CATALOG,
  ICON_CATEGORY_LABELS,
  type IconCategory,
} from '../icons/iconCatalog';

export interface IconPickerFieldProps {
  value?: string | null;
  onChange: (iconId: string) => void;
  allowInherit?: boolean;
  inheritLabel?: string;
  onInherit?: () => void;
  compact?: boolean;
}

export function IconPickerField({
  value,
  onChange,
  allowInherit,
  inheritLabel = 'Usar padrão do bloco',
  onInherit,
  compact = false,
}: IconPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<IconCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BUILDER_ICON_CATALOG.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false;
      if (!q) return true;
      return (
        entry.id.toLowerCase().includes(q)
        || entry.label.toLowerCase().includes(q)
        || entry.keywords.some((k) => k.includes(q))
      );
    });
  }, [query, category]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 border border-black/10 rounded-xl bg-white hover:border-black/20 transition-colors ${compact ? 'p-1.5' : 'px-3 py-2 w-full'}`}
      >
        <BuilderIcon name={value} className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
        {!compact && (
          <span className="text-sm text-zinc-700 flex-1 text-left truncate">
            {value ?? 'Escolher ícone'}
          </span>
        )}
        {!compact && <span className="text-xs text-zinc-400">Alterar</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-black/10 rounded-2xl shadow-xl p-3 max-h-[min(320px,50vh)] flex flex-col">
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar ícone..."
                className="glass-input pl-9 py-2 text-sm w-full"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              <button
                type="button"
                onClick={() => setCategory('all')}
                className={`px-2 py-1 text-[10px] font-semibold rounded-lg ${category === 'all' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}
              >
                Todos
              </button>
              {(Object.keys(ICON_CATEGORY_LABELS) as IconCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-lg ${category === cat ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}
                >
                  {ICON_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
            {allowInherit && onInherit && (
              <button
                type="button"
                onClick={() => { onInherit(); setOpen(false); }}
                className="text-xs text-blue-600 hover:underline mb-2 text-left"
              >
                {inheritLabel}
              </button>
            )}
            <div className="grid grid-cols-6 gap-1 overflow-y-auto custom-scrollbar flex-1">
              {filtered.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  title={entry.label}
                  onClick={() => { onChange(entry.id); setOpen(false); }}
                  className={`p-2 rounded-xl hover:bg-blue-50 border transition-colors ${value === entry.id ? 'border-blue-400 bg-blue-50' : 'border-transparent'}`}
                >
                  <BuilderIcon name={entry.id} className="w-5 h-5 mx-auto text-zinc-700" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

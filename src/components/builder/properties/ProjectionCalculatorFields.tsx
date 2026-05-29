import { Plus, Trash2 } from 'lucide-react';
import type { FieldProps } from './TextFields';
import type { ProjectionOutputConfig, ProjectionSliderConfig, SliderFormat } from '../../../lib/projectionCalculator';

const FORMAT_OPTIONS: { value: SliderFormat; label: string }[] = [
  { value: 'currency', label: 'Moeda (R$)' },
  { value: 'percent', label: 'Percentual (%)' },
  { value: 'decimal', label: 'Decimal (ex. CPC)' },
];

export function ProjectionCalculatorFields({ element, updateElement }: FieldProps) {
  if (element.type !== 'projection_calculator') return null;
  const { props, id } = element;
  const sliders = (props.sliders ?? []) as ProjectionSliderConfig[];
  const outputs = (props.outputs ?? []) as ProjectionOutputConfig[];

  const updateSliders = (next: ProjectionSliderConfig[]) => updateElement(id, { sliders: next });
  const updateOutputs = (next: ProjectionOutputConfig[]) => updateElement(id, { outputs: next });

  return (
    <>
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!props.showProfitBar}
            onChange={(e) => updateElement(id, { showProfitBar: e.target.checked })}
            className="rounded border-black/20"
          />
          <span className="text-sm font-medium text-zinc-700">Mostrar barra de lucro</span>
        </label>
      </div>

      <SliderArrayEditor sliders={sliders} onChange={updateSliders} />
      <OutputArrayEditor outputs={outputs} onChange={updateOutputs} />
    </>
  );
}

function SliderArrayEditor({
  sliders,
  onChange,
}: {
  sliders: ProjectionSliderConfig[];
  onChange: (next: ProjectionSliderConfig[]) => void;
}) {
  return (
    <div className="pt-4 border-t border-black/5">
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Sliders da calculadora
      </label>
      <div className="space-y-3">
        {sliders.map((s, idx) => (
          <div key={s.id} className="p-3 rounded-2xl border border-black/5 bg-white/50 space-y-2">
            <input
              type="text"
              value={s.label}
              onChange={(e) => {
                const next = [...sliders];
                next[idx] = { ...s, label: e.target.value };
                onChange(next);
              }}
              className="glass-input font-medium"
              placeholder="Rótulo"
            />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={s.min} onChange={(e) => { const next = [...sliders]; next[idx] = { ...s, min: Number(e.target.value) }; onChange(next); }} className="glass-input text-sm" placeholder="Mín" />
              <input type="number" value={s.max} onChange={(e) => { const next = [...sliders]; next[idx] = { ...s, max: Number(e.target.value) }; onChange(next); }} className="glass-input text-sm" placeholder="Máx" />
              <input type="number" value={s.step} onChange={(e) => { const next = [...sliders]; next[idx] = { ...s, step: Number(e.target.value) }; onChange(next); }} className="glass-input text-sm" placeholder="Step" />
              <input type="number" value={s.default} onChange={(e) => { const next = [...sliders]; next[idx] = { ...s, default: Number(e.target.value) }; onChange(next); }} className="glass-input text-sm" placeholder="Padrão" />
            </div>
            <select
              value={s.format}
              onChange={(e) => {
                const next = [...sliders];
                next[idx] = { ...s, format: e.target.value as SliderFormat };
                onChange(next);
              }}
              className="glass-input text-sm w-full"
            >
              {FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutputArrayEditor({
  outputs,
  onChange,
}: {
  outputs: ProjectionOutputConfig[];
  onChange: (next: ProjectionOutputConfig[]) => void;
}) {
  return (
    <div className="pt-4 border-t border-black/5">
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Métricas exibidas
      </label>
      <div className="space-y-2">
        {outputs.map((o, idx) => (
          <div key={o.id} className="flex gap-2 items-center">
            <input
              type="text"
              value={o.label}
              onChange={(e) => {
                const next = [...outputs];
                next[idx] = { ...o, label: e.target.value };
                onChange(next);
              }}
              className="flex-1 glass-input text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MetricsTableFields({ element, updateElement }: FieldProps) {
  if (element.type !== 'metrics_table') return null;
  const { props, id } = element;
  const headers: string[] = props.headers ?? [];
  const rows: { label: string; cells: string[]; highlight?: boolean }[] = props.rows ?? [];

  return (
    <>
      <div className="pt-4 border-t border-black/5">
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Colunas (cabeçalho)
        </label>
        <div className="space-y-2">
          {headers.map((h, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={h}
                onChange={(e) => {
                  const next = [...headers];
                  next[idx] = e.target.value;
                  updateElement(id, { headers: next });
                }}
                className="flex-1 glass-input text-sm"
              />
              <button
                type="button"
                onClick={() => updateElement(id, { headers: headers.filter((_, i) => i !== idx) })}
                className="p-2 text-zinc-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateElement(id, { headers: [...headers, 'Nova coluna'] })}
            className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Coluna
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-black/5">
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Linhas
        </label>
        <div className="space-y-3">
          {rows.map((row, rIdx) => (
            <div key={rIdx} className="p-3 rounded-2xl border border-black/5 space-y-2">
              <input
                type="text"
                value={row.label}
                onChange={(e) => {
                  const next = rows.map((r, i) => (i === rIdx ? { ...r, label: e.target.value } : r));
                  updateElement(id, { rows: next });
                }}
                className="glass-input text-sm font-medium"
                placeholder="Métrica"
              />
              {row.cells.map((cell, cIdx) => (
                <input
                  key={cIdx}
                  type="text"
                  value={cell}
                  onChange={(e) => {
                    const next = rows.map((r, i) => {
                      if (i !== rIdx) return r;
                      const cells = [...r.cells];
                      cells[cIdx] = e.target.value;
                      return { ...r, cells };
                    });
                    updateElement(id, { rows: next });
                  }}
                  className="glass-input text-sm"
                  placeholder={`Coluna ${cIdx + 1}`}
                />
              ))}
              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={!!row.highlight}
                  onChange={(e) => {
                    const next = rows.map((r, i) => (i === rIdx ? { ...r, highlight: e.target.checked } : r));
                    updateElement(id, { rows: next });
                  }}
                />
                Destacar linha
              </label>
              <button
                type="button"
                onClick={() => updateElement(id, { rows: rows.filter((_, i) => i !== rIdx) })}
                className="text-xs text-red-500 hover:underline"
              >
                Remover linha
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const colCount = Math.max(headers.length - 1, 1);
              updateElement(id, {
                rows: [
                  ...rows,
                  {
                    label: 'Nova métrica',
                    cells: Array.from({ length: colCount }, () => '—'),
                  },
                ],
              });
            }}
            className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Linha
          </button>
        </div>
      </div>
    </>
  );
}

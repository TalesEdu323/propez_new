import { useEffect, useMemo, useState } from 'react';
import type { ProjectionOutputConfig, ProjectionSliderConfig } from '../../../lib/projectionCalculator';
import {
  computeTrafficRoi,
  formatOutputValue,
  formatSliderDisplay,
  initialSliderValues,
  rawValuesToTrafficRoi,
} from '../../../lib/projectionCalculator';

export interface ProjectionCalculatorProps {
  title?: string;
  subtitle?: string;
  sliders?: ProjectionSliderConfig[];
  outputs?: ProjectionOutputConfig[];
  showProfitBar?: boolean;
  accentColor?: string;
  headerBg?: string;
  profitPositiveColor?: string;
}

export function ProjectionCalculator({
  title = 'Simulador de Retorno',
  subtitle = '',
  sliders = [],
  outputs = [],
  showProfitBar = true,
  accentColor = '#e94560',
  headerBg = '#1a1a2e',
  profitPositiveColor = '#00b894',
}: ProjectionCalculatorProps) {
  const [raw, setRaw] = useState<Record<string, number>>(() => initialSliderValues(sliders));

  useEffect(() => {
    setRaw(initialSliderValues(sliders));
  }, [sliders]);

  const roiValues = useMemo(() => rawValuesToTrafficRoi(sliders, raw), [sliders, raw]);
  const result = useMemo(() => computeTrafficRoi(roiValues), [roiValues]);

  const profitBarWidth = Math.max(result.profitPct, 5);
  const profitPositive = result.profit >= 0;

  const stopPointer = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div className="w-full overflow-hidden rounded-2xl border-2 border-black/10 shadow-lg bg-white">
      <div className="px-6 py-5 sm:px-8" style={{ backgroundColor: headerBg, color: '#fff' }}>
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        {subtitle ? <p className="text-sm opacity-70 mt-1">{subtitle}</p> : null}
      </div>

      <div className="p-6 sm:p-8" onPointerDown={stopPointer}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {sliders.map((slider) => {
            const value = raw[slider.id] ?? slider.default;
            const hint = slider.hintMin && slider.hintMax
              ? `${slider.hintMin} — ${slider.hintMax}`
              : `${slider.min} — ${slider.max}`;
            return (
              <div key={slider.id}>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  {slider.label}
                </label>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
                    {formatSliderDisplay(slider, value)}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium">{hint}</span>
                </div>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={value}
                  onChange={(e) => setRaw((prev) => ({ ...prev, [slider.id]: Number(e.target.value) }))}
                  className="w-full h-2 rounded-full appearance-none cursor-grab active:cursor-grabbing bg-zinc-200 accent-[var(--calc-accent)]"
                  style={{ ['--calc-accent' as string]: accentColor }}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-7 pt-7 border-t-2 border-zinc-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {outputs.map((out) => {
              const highlight = out.highlight === 'green';
              const val = formatOutputValue(out, result);
              return (
                <div key={out.id} className="rounded-xl bg-zinc-50 p-4 text-center">
                  <div
                    className={`text-xl sm:text-2xl font-extrabold tracking-tight ${highlight ? '' : 'text-zinc-900'}`}
                    style={highlight ? { color: profitPositiveColor } : undefined}
                  >
                    {val}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mt-1.5">
                    {out.label}
                  </div>
                </div>
              );
            })}
          </div>

          {showProfitBar && (
            <div className="mt-6 rounded-xl bg-zinc-50 p-5">
              <div className="flex justify-between text-sm font-semibold text-zinc-700 mb-2">
                <span>Investimento em Mídia</span>
                <span>
                  {profitPositive ? 'Lucro: ' : 'Prejuízo: '}
                  {formatOutputValue({ id: 'profit', label: '', format: 'currency' }, result)}
                </span>
              </div>
              <div className="h-8 rounded-full bg-zinc-200 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-3 text-xs font-bold text-white transition-all duration-500 ease-out"
                  style={{
                    width: `${profitBarWidth}%`,
                    backgroundColor: profitPositive ? profitPositiveColor : accentColor,
                  }}
                >
                  {result.profitPct.toFixed(0)}% margem líquida
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

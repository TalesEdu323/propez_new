import type { BuilderViewport } from '../../../types/builder';

export interface MetricsTableRow {
  label: string;
  cells: string[];
  highlight?: boolean;
}

export interface MetricsTableProps {
  title?: string;
  headers?: string[];
  rows?: MetricsTableRow[];
  headerBg?: string;
  highlightColor?: string;
  bgColor?: string;
  viewport?: BuilderViewport;
}

function cellPadding(viewport: BuilderViewport): string {
  return viewport === 'desktop' ? 'px-3 sm:px-4' : 'px-3';
}

function titlePadding(viewport: BuilderViewport): string {
  return viewport === 'desktop' ? 'px-4 sm:px-6' : 'px-4';
}

function tableMinWidth(viewport: BuilderViewport): string {
  if (viewport === 'mobile') return 'min-w-[280px]';
  if (viewport === 'tablet') return 'min-w-[400px]';
  return 'min-w-[280px] sm:min-w-[480px]';
}

export function MetricsTable({
  title,
  headers = [],
  rows = [],
  headerBg = '#1a1a2e',
  highlightColor = '#00b894',
  bgColor = '#ffffff',
  viewport = 'desktop',
}: MetricsTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-black/10 shadow-md" style={{ backgroundColor: bgColor }}>
      {title ? (
        <div className={`${titlePadding(viewport)} py-4 border-b border-black/5`}>
          <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
        </div>
      ) : null}
      <table className={`w-full text-sm border-collapse ${tableMinWidth(viewport)}`}>
        <thead>
          <tr>
            {headers.map((h, idx) => (
              <th
                key={idx}
                className={`${cellPadding(viewport)} py-3.5 font-semibold text-white text-xs uppercase tracking-wider text-center ${idx === 0 ? 'text-left rounded-tl-xl' : ''} ${idx === headers.length - 1 ? 'rounded-tr-xl' : ''}`}
                style={{ backgroundColor: headerBg }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className={`border-b border-black/5 last:border-0 ${row.highlight ? 'bg-emerald-50/60' : ''}`}
            >
              <td className={`${cellPadding(viewport)} py-3 font-semibold text-zinc-800 text-left`}>{row.label}</td>
              {row.cells.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className={`${cellPadding(viewport)} py-3 text-center font-medium ${row.highlight ? 'font-bold' : 'text-zinc-700'}`}
                  style={row.highlight ? { color: highlightColor } : undefined}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

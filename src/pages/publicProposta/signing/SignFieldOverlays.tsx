const TYPE_LABELS: Record<string, string> = {
  SIGNATURE: 'Assinar aqui',
  INITIALS: 'Rubricar aqui',
  TEXT: 'Texto',
};

export interface SignFieldOverlay {
  type: string;
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export function SignFieldOverlays({ fields }: { fields: SignFieldOverlay[] }) {
  const pageOne = fields.filter((f) => f.page === 1);
  if (pageOne.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {pageOne.map((f, i) => (
        <div
          key={`${f.type}-${i}`}
          className="absolute border-2 border-dashed border-emerald-500 bg-emerald-400/15 rounded flex items-center justify-center"
          style={{
            left: `${f.xPct}%`,
            top: `${f.yPct}%`,
            width: `${f.widthPct}%`,
            height: `${f.heightPct}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 px-1 text-center">
            {TYPE_LABELS[f.type] ?? f.type}
          </span>
        </div>
      ))}
    </div>
  );
}

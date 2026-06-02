export function normalizePct(v: number): number {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  if (n <= 1 && n >= 0) return n * 100;
  return n;
}

export function markToPdfCoords(
  pageWidth: number,
  pageHeight: number,
  xPct: number,
  yPct: number,
  widthPct: number,
  heightPct: number,
): { x: number; y: number; width: number; height: number } {
  if (!Number.isFinite(pageWidth) || !Number.isFinite(pageHeight) || pageWidth <= 0 || pageHeight <= 0) {
    return { x: 0, y: 0, width: 100, height: 40 };
  }
  const w = Math.max(10, (normalizePct(widthPct) / 100) * pageWidth);
  const h = Math.max(10, (normalizePct(heightPct) / 100) * pageHeight);
  const centerX = (normalizePct(xPct) / 100) * pageWidth;
  const centerYFromTop = (normalizePct(yPct) / 100) * pageHeight;
  const centerYFromBottom = pageHeight - centerYFromTop;
  return {
    x: centerX - w / 2,
    y: centerYFromBottom - h / 2,
    width: w,
    height: h,
  };
}

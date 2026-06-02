import { useEffect, useRef, useState, useCallback, type PointerEvent as ReactPointerEvent } from 'react';

interface Props {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  height?: number;
  className?: string;
}

export function SignatureCanvas({ onChange, disabled, height = 200, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  const syncEmpty = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hasInk = data.some((v, i) => i % 4 === 3 && v > 0);
    setEmpty(!hasInk);
    onChange(hasInk ? canvas.toDataURL('image/png') : null);
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const configure = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const prev = !empty ? canvas.toDataURL('image/png') : null;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#111827';
      ctx.clearRect(0, 0, rect.width, rect.height);
      if (prev) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = prev;
      }
    };

    configure();
    const ro = new ResizeObserver(configure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [empty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.height = `${height}px`;
  }, [height]);

  const point = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    syncEmpty();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          className="w-full block rounded-lg border border-gray-300 bg-white cursor-crosshair touch-none"
          style={{ touchAction: 'none', height }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <button
        type="button"
        onClick={clear}
        disabled={disabled || empty}
        className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
      >
        Limpar assinatura
      </button>
    </div>
  );
}

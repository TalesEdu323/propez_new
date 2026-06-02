import { Loader2 } from 'lucide-react';

interface WaitOverlayProps {
  message?: string;
  fullScreen?: boolean;
}

export function WaitOverlay({
  message = 'Aguarde, carregando...',
  fullScreen = true,
}: WaitOverlayProps) {
  return (
    <div
      className={`z-50 flex items-center justify-center bg-black/35 backdrop-blur-[1px] ${
        fullScreen ? 'fixed inset-0' : 'absolute inset-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-xl border border-white/50 bg-white px-4 py-3 shadow-lg">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
        <span className="text-sm font-medium text-zinc-800">{message}</span>
      </div>
    </div>
  );
}

import { ShieldCheck } from 'lucide-react';
import type { NavigateFn } from '../types/navigation';

interface AppTopBarProps {
  navigate: NavigateFn;
  showPlatformButton: boolean;
}

export function AppTopBar({ navigate, showPlatformButton }: AppTopBarProps) {
  if (!showPlatformButton) return null;

  return (
    <div className="sticky top-0 z-30 hidden md:flex items-center justify-end h-14 px-6 md:px-8 bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-black/[0.03] shrink-0">
      <button
        type="button"
        onClick={() => navigate('admin-dashboard')}
        className="flex items-center gap-2 bg-white border border-black/5 text-zinc-800 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:bg-zinc-50 hover:shadow-md active:scale-[0.98]"
      >
        <ShieldCheck className="w-4 h-4 text-zinc-600" />
        Plataforma
      </button>
    </div>
  );
}

/** Botão compacto para barra mobile */
export function AppTopBarMobileButton({
  navigate,
  showPlatformButton,
}: AppTopBarProps) {
  if (!showPlatformButton) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('admin-dashboard')}
      className="w-10 h-10 flex items-center justify-center text-zinc-700 bg-zinc-100 rounded-full active:scale-95 transition-all"
      title="Painel da Plataforma"
    >
      <ShieldCheck className="w-5 h-5" />
    </button>
  );
}

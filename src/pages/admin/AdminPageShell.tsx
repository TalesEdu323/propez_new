import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import type { AppRoute, NavigateFn } from '../../types/navigation';

interface AdminPageShellProps {
  navigate: NavigateFn;
  current: AppRoute;
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  children: ReactNode;
}

export default function AdminPageShell({
  title,
  subtitle,
  onRefresh,
  refreshing,
  children,
}: AdminPageShellProps) {
  return (
    <div className="min-h-full bg-[#F5F5F7] font-sans selection:bg-zinc-200">
      <div className="page-container">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1.5"
          >
            <h1 className="page-title font-bold">{title}</h1>
            {subtitle && (
              <p className="text-zinc-500 text-sm md:text-base mt-1.5">{subtitle}</p>
            )}
          </motion.div>

          {onRefresh && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 bg-white border border-black/5 text-zinc-700 px-5 py-3 rounded-2xl font-semibold text-sm transition-all hover:bg-zinc-50 hover:shadow-md active:scale-[0.98] disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </motion.div>
          )}
        </header>

        <div className="space-y-6 md:space-y-8">{children}</div>
      </div>
    </div>
  );
}

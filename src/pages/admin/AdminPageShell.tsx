import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import type { AppRoute, NavigateFn } from '../../types/navigation';
import AdminAlertBell from './AdminAlertBell';

interface AdminTab {
  id: AppRoute;
  label: string;
}

const ADMIN_TABS: AdminTab[] = [
  { id: 'admin-dashboard', label: 'Command Center' },
  { id: 'admin-retention', label: 'Retenção' },
  { id: 'admin-acquisition', label: 'Aquisição' },
  { id: 'admin-product', label: 'Produto' },
  { id: 'admin-organizations', label: 'Organizações' },
  { id: 'admin-subscriptions', label: 'Assinaturas' },
  { id: 'admin-users', label: 'Usuários' },
  { id: 'admin-operations', label: 'Operações' },
  { id: 'admin-marketplace', label: 'Templates' },
];

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
  navigate,
  current,
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
            <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-semibold uppercase tracking-[0.15em]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Painel da Plataforma
            </div>
            <h1 className="page-title font-bold">{title}</h1>
            {subtitle && (
              <p className="text-zinc-500 text-sm md:text-base mt-1.5">{subtitle}</p>
            )}
          </motion.div>

          <div className="flex items-center gap-3">
            <AdminAlertBell navigate={navigate} />
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
          </div>
        </header>

        <nav className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {ADMIN_TABS.map((tab) => {
            const active = current === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-zinc-900 text-white shadow-[0_10px_20px_-5px_rgba(0,0,0,0.15)]'
                    : 'bg-white border border-black/5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-6 md:space-y-8">{children}</div>
      </div>
    </div>
  );
}

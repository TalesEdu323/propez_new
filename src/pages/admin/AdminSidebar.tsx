import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { AppRoute, NavigateFn } from '../../types/navigation';
import { PropezLogo } from '../../components/PropezLogo';
import AdminAlertBell from './AdminAlertBell';
import { ADMIN_NAV_ITEMS, resolveAdminNavActive } from './adminNav';

interface AdminSidebarProps {
  navigate: NavigateFn;
  current: AppRoute;
}

export default function AdminSidebar({ navigate, current }: AdminSidebarProps) {
  const activeRoute = resolveAdminNavActive(current);
  const activeItem = ADMIN_NAV_ITEMS.find((item) => item.id === activeRoute);

  return (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-2xl border-r border-black/[0.05] z-40 shrink-0 h-full"
    >
      <div className="p-6 border-b border-black/[0.03]">
        <PropezLogo height="md" />
        <div className="flex items-center gap-2 mt-6 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.15em]">
          <ShieldCheck className="w-3.5 h-3.5" />
          Painel da Plataforma
        </div>
        {activeItem?.subtitle && (
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{activeItem.subtitle}</p>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive = activeRoute === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-[0_10px_20px_-5px_rgba(0,0,0,0.15)]'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'opacity-100' : 'opacity-60'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-black/[0.03] space-y-2">
        <div className="flex justify-center pb-1">
          <AdminAlertBell navigate={navigate} />
        </div>
        <button
          type="button"
          onClick={() => navigate('dashboard')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao app
        </button>
      </div>
    </motion.aside>
  );
}

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import type { AppRoute, NavigateFn } from '../../types/navigation';
import AdminSidebar from './AdminSidebar';
import { ADMIN_NAV_ITEMS, resolveAdminNavActive } from './adminNav';

interface AdminLayoutProps {
  navigate: NavigateFn;
  current: AppRoute;
  children: ReactNode;
}

export default function AdminLayout({ navigate, current, children }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeRoute = resolveAdminNavActive(current);

  return (
    <div className="flex h-screen bg-[#F5F5F7] font-sans overflow-hidden">
      <AdminSidebar navigate={navigate} current={current} />

      {/* Mobile admin header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-2xl border-b border-black/[0.05] z-50 flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-700"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          <ShieldCheck className="w-4 h-4" />
          Plataforma
        </div>
        <button
          type="button"
          onClick={() => navigate('dashboard')}
          className="text-xs font-semibold text-zinc-600 px-3 py-2 rounded-xl bg-zinc-100"
        >
          Sair
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="absolute left-0 top-0 bottom-0 w-[min(280px,85vw)] bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-black/5">
              <span className="text-sm font-bold text-zinc-900">Painel da Plataforma</span>
              <button type="button" onClick={() => setMobileOpen(false)} className="p-2 text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate(item.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${
                      isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-black/5">
              <button
                type="button"
                onClick={() => navigate('dashboard')}
                className="w-full py-3 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-700"
              >
                Voltar ao app
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto w-full mobile-safe-top md:pt-0 pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

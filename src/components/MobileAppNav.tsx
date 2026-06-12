import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Layers,
  Briefcase,
  Calendar,
  DollarSign,
  Settings,
  LogOut,
  MoreHorizontal,
  CreditCard,
  X,
} from 'lucide-react';
import type { AppRoute, NavigateFn } from '../types/navigation';

interface NavItem {
  id: AppRoute;
  label: string;
  icon: React.ReactNode;
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Início', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'clientes', label: 'Clientes', icon: <Users className="w-5 h-5" /> },
  { id: 'propostas', label: 'Propostas', icon: <FileText className="w-5 h-5" /> },
  { id: 'modelos', label: 'Modelos', icon: <Layers className="w-5 h-5" /> },
];

const MORE_NAV: NavItem[] = [
  { id: 'servicos', label: 'Serviços', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'contratos', label: 'Contratos', icon: <FileText className="w-5 h-5" /> },
  { id: 'agenda', label: 'Agenda', icon: <Calendar className="w-5 h-5" /> },
  { id: 'pagamentos', label: 'Pagamentos', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'configuracoes', label: 'Configurações', icon: <Settings className="w-5 h-5" /> },
  { id: 'planos', label: 'Planos', icon: <CreditCard className="w-5 h-5" /> },
];

const MORE_ROUTE_IDS = new Set<AppRoute>(MORE_NAV.map((item) => item.id));

interface MobileAppNavProps {
  route: AppRoute;
  navigate: NavigateFn;
  onLogout: () => void;
  navActiveClass: string;
}

export function MobileAppNav({ route, navigate, onLogout, navActiveClass }: MobileAppNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isMoreActive = MORE_ROUTE_IDS.has(route);

  const handleNavigate = (id: AppRoute) => {
    navigate(id);
    setMoreOpen(false);
  };

  return (
    <>
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
        <div className="h-[4.5rem] bg-white/90 backdrop-blur-2xl border border-black/[0.05] rounded-[1.75rem] px-2 flex items-stretch justify-around shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)]">
          {PRIMARY_NAV.map((item) => {
            const isActive = route === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-all active:scale-95 ${
                  isActive ? 'text-zinc-900' : 'text-zinc-400'
                }`}
              >
                <div className={`transition-all ${isActive ? 'scale-110 -translate-y-0.5' : 'scale-100'}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-semibold leading-none ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-all active:scale-95 ${
              isMoreActive ? 'text-zinc-900' : 'text-zinc-400'
            }`}
          >
            <div className={`transition-all ${isMoreActive ? 'scale-110 -translate-y-0.5' : 'scale-100'}`}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-semibold leading-none ${isMoreActive ? 'opacity-100' : 'opacity-70'}`}>
              Mais
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {moreOpen && (
          <div className="md:hidden fixed inset-0 z-[60]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="absolute bottom-0 left-0 right-0 max-h-[75vh] bg-white rounded-t-[1.75rem] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 shrink-0">
                <span className="text-sm font-bold text-zinc-900">Menu</span>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="overflow-y-auto p-3 space-y-1">
                {MORE_NAV.map((item) => {
                  const isActive = route === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold min-h-[44px] ${
                        isActive ? navActiveClass : 'text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 min-h-[44px] mt-2"
                >
                  <LogOut className="w-5 h-5" />
                  Sair
                </button>
              </nav>
              <div className="h-[env(safe-area-inset-bottom,0px)] shrink-0" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/** All nav items for desktop sidebar */
export const DESKTOP_NAV_ITEMS: NavItem[] = [
  ...PRIMARY_NAV.map((item) =>
    item.id === 'dashboard' ? { ...item, label: 'Dashboard' } : item,
  ),
  ...MORE_NAV.filter((item) => item.id !== 'configuracoes' && item.id !== 'planos'),
];

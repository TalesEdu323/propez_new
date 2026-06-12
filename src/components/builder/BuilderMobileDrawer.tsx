import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface BuilderMobileDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function BuilderMobileDrawer({ open, title, onClose, children }: BuilderMobileDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="md:hidden fixed inset-0 z-[70]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-white rounded-t-2xl shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 shrink-0">
              <span className="text-sm font-bold text-zinc-900">{title}</span>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">{children}</div>
            <div className="h-[env(safe-area-inset-bottom,0px)] shrink-0" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export type BuilderMobilePanel = 'none' | 'widgets' | 'properties' | 'layout';

interface BuilderMobileTabBarProps {
  active: BuilderMobilePanel;
  onSelect: (panel: BuilderMobilePanel) => void;
  showLayout: boolean;
}

export function BuilderMobileTabBar({ active, onSelect, showLayout }: BuilderMobileTabBarProps) {
  const tabs: { id: BuilderMobilePanel; label: string }[] = [
    { id: 'widgets', label: 'Widgets' },
    { id: 'properties', label: 'Propriedades' },
  ];
  if (showLayout) {
    tabs.push({ id: 'layout', label: 'Layout' });
  }

  return (
    <div className="md:hidden shrink-0 border-t border-black/5 bg-white/95 backdrop-blur-xl px-2 py-2 flex gap-1">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(isActive ? 'none' : tab.id)}
            className={`flex-1 min-h-[44px] rounded-xl text-xs font-semibold transition-all ${
              isActive ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

interface ListingShellProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: ReactNode;
  viewToggle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function ListingShell({
  searchPlaceholder = 'Buscar...',
  searchValue,
  onSearchChange,
  filters,
  viewToggle,
  actions,
  children,
}: ListingShellProps) {
  return (
    <div className="apple-card overflow-hidden !p-0">
      <div className="p-6 md:p-10 border-b border-zinc-100/50 bg-zinc-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="relative max-w-md w-full flex-1">
            <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="glass-input pl-12 pr-5 py-3.5 text-sm font-medium w-full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {filters}
            {viewToggle}
            {actions}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

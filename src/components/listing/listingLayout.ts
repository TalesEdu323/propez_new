export type ListingStatusTone = 'waiting' | 'success' | 'rejected' | 'neutral';

export const LISTING_GRID_CLASS =
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6';

export const LISTING_LIST_CLASS = 'flex flex-col gap-2';

export const LISTING_VIEW_TOGGLE_WRAP_CLASS =
  'flex items-center gap-1 p-1 rounded-xl bg-zinc-100/80 border border-zinc-200/60';

export const LISTING_EMPTY_STATE_CLASS = 'text-center py-20 sm:py-28 px-6';

export function getListingStatusColors(tone: ListingStatusTone): {
  bar: string;
  footer: string;
  badge: string;
  progress: string;
} {
  switch (tone) {
    case 'success':
      return {
        bar: 'bg-[#89D6A3]',
        footer: 'bg-[#89D6A3] border-[#89D6A3] text-gray-800',
        badge: 'bg-[#89D6A3]/20 text-emerald-800',
        progress: 'bg-[#89D6A3]',
      };
    case 'rejected':
      return {
        bar: 'bg-[#ffbea0]',
        footer: 'bg-[#ffbea0] border-[#ffbea0] text-gray-800',
        badge: 'bg-[#ffbea0]/30 text-red-900',
        progress: 'bg-[#ffbea0]',
      };
    case 'waiting':
      return {
        bar: 'bg-[#FDE68A]',
        footer: 'bg-[#FDE68A] border-[#FDE68A] text-gray-800',
        badge: 'bg-[#FDE68A]/40 text-amber-900',
        progress: 'bg-[#FDE68A]',
      };
    default:
      return {
        bar: 'bg-zinc-200',
        footer: 'bg-zinc-100 border-zinc-200 text-zinc-600',
        badge: 'bg-zinc-100 text-zinc-600',
        progress: 'bg-zinc-300',
      };
  }
}

export function readListingView(storageKey: string, fallback: 'grid' | 'list' = 'grid'): 'grid' | 'list' {
  if (typeof window === 'undefined') return fallback;
  const v = localStorage.getItem(storageKey);
  return v === 'list' || v === 'grid' ? v : fallback;
}

export function persistListingView(storageKey: string, view: 'grid' | 'list'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey, view);
}

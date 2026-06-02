import { Grid3x3, List } from 'lucide-react';
import {
  LISTING_VIEW_TOGGLE_WRAP_CLASS,
  persistListingView,
  readListingView,
} from './listingLayout';

export function createListingViewState(
  storageKey: string,
  fallback: 'grid' | 'list' = 'grid',
): 'grid' | 'list' {
  return readListingView(storageKey, fallback);
}

interface ListingViewToggleUIProps {
  view: 'grid' | 'list';
  onChange: (view: 'grid' | 'list') => void;
  storageKey: string;
}

export function ListingViewToggle({ view, onChange, storageKey }: ListingViewToggleUIProps) {
  const handle = (next: 'grid' | 'list') => {
    persistListingView(storageKey, next);
    onChange(next);
  };

  return (
    <div className={LISTING_VIEW_TOGGLE_WRAP_CLASS}>
      <button
        type="button"
        onClick={() => handle('list')}
        className={`p-2 rounded-lg transition-all ${
          view === 'list' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
        }`}
        title="Lista"
        aria-pressed={view === 'list'}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => handle('grid')}
        className={`p-2 rounded-lg transition-all ${
          view === 'grid' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
        }`}
        title="Grade"
        aria-pressed={view === 'grid'}
      >
        <Grid3x3 className="w-4 h-4" />
      </button>
    </div>
  );
}

import { Grid3x3, List } from 'lucide-react';
import { LISTING_VIEW_TOGGLE_WRAP_CLASS } from './listingLayout';

interface ListingViewToggleUIProps {
  view: 'grid' | 'list';
  onChange: (view: 'grid' | 'list') => void;
}

export function ListingViewToggle({ view, onChange }: ListingViewToggleUIProps) {
  return (
    <div className={LISTING_VIEW_TOGGLE_WRAP_CLASS}>
      <button
        type="button"
        onClick={() => onChange('list')}
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
        onClick={() => onChange('grid')}
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

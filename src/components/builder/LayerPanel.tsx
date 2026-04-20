import { ChevronDown, Minus } from 'lucide-react';
import type { BuilderElement } from '../../types/builder';

export interface LayerTreeProps {
  elements: BuilderElement[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  level?: number;
}

/**
 * Árvore de camadas que representa a hierarquia atual de elementos do Builder.
 * Purely presentacional: usa selectedId para destacar e setSelectedId para navegar.
 */
export function LayerTree({ elements, selectedId, setSelectedId, level = 0 }: LayerTreeProps) {
  return (
    <div className="space-y-1">
      {elements.map(el => (
        <div key={el.id}>
          <div
            onClick={() => setSelectedId(el.id)}
            className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer text-sm transition-all ${selectedId === el.id ? 'bg-blue-50 text-blue-600 font-medium border border-blue-100 shadow-sm' : 'hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 border border-transparent'}`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
          >
            <div className={`w-4 h-4 flex items-center justify-center ${selectedId === el.id ? 'text-blue-500' : 'text-zinc-400'}`}>
              {el.children && el.children.length > 0 ? <ChevronDown className="w-3 h-3" /> : <Minus className="w-3 h-3 opacity-50" />}
            </div>
            <span className="capitalize">{el.type.replace('_', ' ')}</span>
          </div>
          {el.children && el.children.length > 0 && (
            <LayerTree elements={el.children} selectedId={selectedId} setSelectedId={setSelectedId} level={level + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

import { Settings, Layers, MousePointerClick } from 'lucide-react';
import type { BuilderElement } from '../../types/builder';
import { LayerTree } from './LayerPanel';
import { TextFields, DateTimeFields, DescriptionFields, UrlFields } from './properties/TextFields';
import { AlignField, LayoutFields } from './properties/LayoutFields';
import { ColorFields } from './properties/ColorFields';
import { ArrayEditors } from './properties/ArrayEditors';

export type BuilderTab = 'properties' | 'layers';

export interface PropertiesPanelProps {
  elements: BuilderElement[];
  selectedId: string | null;
  selectedElement: BuilderElement | undefined;
  activeTab: BuilderTab;
  setActiveTab: (tab: BuilderTab) => void;
  setSelectedId: (id: string | null) => void;
  updateElement: (id: string, patch: Record<string, any>) => void;
}

/**
 * Painel lateral direito do Builder. Alterna entre "Propriedades" do elemento
 * selecionado e a árvore de "Estrutura" (camadas). Toda a renderização de
 * campos é delegada a componentes específicos em ./properties/*.
 */
export function PropertiesPanel({
  elements,
  selectedId,
  selectedElement,
  activeTab,
  setActiveTab,
  setSelectedId,
  updateElement,
}: PropertiesPanelProps) {
  return (
    <div className="w-[320px] glass-panel border-l border-black/5 flex flex-col z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] transition-all">
      <div className="flex border-b border-black/5 bg-zinc-50/80 shrink-0 p-2 gap-2">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 font-medium text-sm transition-all rounded-xl ${activeTab === 'properties' ? 'text-zinc-900 bg-white shadow-sm border border-black/5' : 'text-zinc-500 hover:text-zinc-700 hover:bg-black/5'}`}
        >
          <Settings className="w-4 h-4" /> Propriedades
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 font-medium text-sm transition-all rounded-xl ${activeTab === 'layers' ? 'text-zinc-900 bg-white shadow-sm border border-black/5' : 'text-zinc-500 hover:text-zinc-700 hover:bg-black/5'}`}
        >
          <Layers className="w-4 h-4" /> Estrutura
        </button>
      </div>

      <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'layers' ? (
          elements.length === 0 ? (
            <div className="text-center text-zinc-500 mt-10">
              <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Nenhum elemento na página ainda.</p>
            </div>
          ) : (
            <LayerTree elements={elements} selectedId={selectedId} setSelectedId={setSelectedId} />
          )
        ) : !selectedElement ? (
          <div className="text-center text-zinc-500 mt-10">
            <MousePointerClick className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">Selecione um elemento na tela para editar suas propriedades.</p>
          </div>
        ) : (
          <div className="space-y-6 pb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold rounded-lg uppercase tracking-wider mb-2">
              <Settings className="w-3.5 h-3.5" />
              {selectedElement.type.replace('_', ' ')}
            </div>

            <div className="space-y-5">
              <TextFields element={selectedElement} updateElement={updateElement} />
              <DateTimeFields element={selectedElement} updateElement={updateElement} />
              <DescriptionFields element={selectedElement} updateElement={updateElement} />
              <UrlFields element={selectedElement} updateElement={updateElement} />
            </div>

            <div className="h-px w-full bg-black/5 my-6" />

            <div className="space-y-5">
              <AlignField element={selectedElement} updateElement={updateElement} />
              <ColorFields element={selectedElement} updateElement={updateElement} />
              <LayoutFields element={selectedElement} updateElement={updateElement} />
            </div>

            <ArrayEditors element={selectedElement} updateElement={updateElement} />
          </div>
        )}
      </div>
    </div>
  );
}

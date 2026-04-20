import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Layers, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import type { BuilderElement } from '../../types/builder';
import { RenderElement } from './RenderElement';

interface BuilderCanvasProps {
  elements: BuilderElement[];
  selectedId: string | null;
  previewMode: boolean;
  onSelectElement: (id: string | null) => void;
  onGoToLayers: (id: string) => void;
  onMoveElement: (id: string, direction: 'up' | 'down') => void;
  onDeleteElement: (id: string) => void;
  onDropRoot: (event: React.DragEvent) => void;
  onDropChild: (event: React.DragEvent, parentId: string) => void;
  onDragOver: (event: React.DragEvent) => void;
  toolbar?: React.ReactNode;
}

/**
 * Área central do Builder: recebe os elementos e os renderiza recursivamente,
 * incluindo o overlay de seleção, controles de mover/excluir e o drop target raiz.
 *
 * Todos os efeitos e callbacks vêm por props, mantendo este componente puro
 * em relação ao estado do Builder principal.
 */
export function BuilderCanvas({
  elements,
  selectedId,
  previewMode,
  onSelectElement,
  onGoToLayers,
  onMoveElement,
  onDeleteElement,
  onDropRoot,
  onDropChild,
  onDragOver,
  toolbar,
}: BuilderCanvasProps) {
  const renderElementNode = (el: BuilderElement) => {
    const isSelected = selectedId === el.id;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        key={el.id}
        onClick={(e) => {
          e.stopPropagation();
          if (!previewMode) onSelectElement(el.id);
        }}
        className={`relative group transition-all duration-200 ${previewMode ? '' : 'border-2 rounded-2xl p-2'} ${!previewMode && isSelected ? 'border-blue-500/50 shadow-[0_0_0_4px_rgba(59,130,246,0.1)] z-10 bg-blue-50/30' : !previewMode ? 'border-transparent hover:border-black/5 hover:bg-black/5' : ''}`}
      >
        {!previewMode && (
          <div className={`absolute -top-5 right-4 bg-white border border-black/10 text-zinc-900 rounded-xl shadow-xl flex items-center overflow-hidden transition-all duration-200 z-20 ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-zinc-50 border-r border-black/5 text-zinc-500">
              {el.type.replace('_', ' ')}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onGoToLayers(el.id); }}
              className="p-2 hover:bg-zinc-50 border-r border-black/5 text-zinc-600 hover:text-blue-600 transition-colors"
              title="Ver na Estrutura"
            ><Layers className="w-4 h-4" /></button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveElement(el.id, 'up'); }}
              className="p-2 hover:bg-zinc-50 text-zinc-600 hover:text-blue-600 transition-colors"
              title="Mover para cima"
            ><ArrowUp className="w-4 h-4" /></button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveElement(el.id, 'down'); }}
              className="p-2 hover:bg-zinc-50 border-l border-black/5 text-zinc-600 hover:text-blue-600 transition-colors"
              title="Mover para baixo"
            ><ArrowDown className="w-4 h-4" /></button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteElement(el.id); }}
              className="p-2 hover:bg-red-50 border-l border-black/5 text-red-500 hover:text-red-600 transition-colors"
              title="Excluir"
            ><Trash2 className="w-4 h-4" /></button>
          </div>
        )}

        <div className={`${(el.type === 'grid' || el.type === 'container' || el.type === 'column') && !previewMode ? '' : 'pointer-events-none'} ${el.type === 'button' ? `flex justify-${el.props.align === 'left' ? 'start' : el.props.align === 'right' ? 'end' : 'center'}` : ''} ${el.type === 'column' ? 'h-full' : ''}`}>
          {el.type === 'grid' ? (
            <div
              className={`grid ${el.props.columns === '1' ? 'grid-cols-1' : el.props.columns === '2' ? 'grid-cols-2' : el.props.columns === '3' ? 'grid-cols-3' : el.props.columns === '4' ? 'grid-cols-4' : el.props.columns === '5' ? 'grid-cols-5' : 'grid-cols-6'} ${el.props.radius}`}
              style={{
                gap: `${el.props.gap}px`,
                padding: `${el.props.padding}px`,
                backgroundColor: el.props.bgColor as string | undefined,
              }}
            >
              {(!el.children || el.children.length === 0) && !previewMode ? (
                <div
                  className="col-span-full p-8 border-2 border-dashed border-black/10 rounded-2xl flex flex-col items-center justify-center text-zinc-500 bg-zinc-50/50 backdrop-blur-sm"
                  onDrop={(e) => onDropChild(e, el.id)}
                  onDragOver={onDragOver}
                >
                  <Plus className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm font-medium">Arraste elementos para este Grid</span>
                </div>
              ) : (
                el.children?.map(child => renderElementNode(child))
              )}
            </div>
          ) : el.type === 'container' || el.type === 'column' ? (
            <div
              className={`flex flex-col ${el.props.radius} ${el.props.shadow} h-full`}
              style={{
                padding: `${el.props.padding}px`,
                backgroundColor: el.props.bgColor as string | undefined,
                alignItems: el.props.align === 'center' ? 'center' : el.props.align === 'right' ? 'flex-end' : 'flex-start',
              }}
              onDrop={(e) => onDropChild(e, el.id)}
              onDragOver={onDragOver}
            >
              {(!el.children || el.children.length === 0) && !previewMode ? (
                <div className="w-full h-full min-h-[120px] border-2 border-dashed border-black/10 rounded-2xl flex flex-col items-center justify-center text-zinc-500 bg-zinc-50/50 backdrop-blur-sm">
                  <Plus className="w-6 h-6 mb-2 opacity-50" />
                  <span className="text-xs font-medium text-center px-2">Arraste para esta {el.type === 'column' ? 'coluna' : 'área'}</span>
                </div>
              ) : (
                el.children?.map(child => renderElementNode(child))
              )}
            </div>
          ) : (
            <RenderElement element={el} previewMode={previewMode} />
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div
      className="flex-1 flex flex-col relative overflow-y-auto custom-scrollbar bg-transparent"
      onDrop={onDropRoot}
      onDragOver={onDragOver}
      onClick={() => onSelectElement(null)}
    >
      {toolbar}
      <div className={`min-h-full flex justify-center ${previewMode ? 'p-0' : 'p-8'}`}>
        <div className={`w-full max-w-5xl bg-white min-h-[800px] transition-all duration-500 ${previewMode ? '' : 'shadow-xl border border-black/5 rounded-[2rem] p-8 pb-32 ring-1 ring-black/5'}`}>
          {elements.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-black/10 rounded-3xl p-12 bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-black/5 flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-zinc-400" />
              </div>
              <p className="text-lg font-medium text-zinc-900">Sua página está vazia</p>
              <p className="text-sm mt-2 text-zinc-500">Arraste elementos da barra lateral para começar a construir.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              <AnimatePresence>
                {elements.map((el) => renderElementNode(el))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { BuilderCanvasProps };

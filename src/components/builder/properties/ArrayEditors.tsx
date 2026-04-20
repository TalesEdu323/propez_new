import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FieldProps } from './TextFields';

interface StringArrayEditorProps extends FieldProps {
  propKey: 'links' | 'images' | 'items';
  title: string;
  placeholder?: string;
  addLabel: string;
  defaultItem: string;
}

function StringArrayEditor({ element, updateElement, propKey, title, placeholder, addLabel, defaultItem }: StringArrayEditorProps) {
  const { props, id } = element;
  if (!(propKey in props)) return null;
  const list: string[] = props[propKey];

  return (
    <div className="pt-4 border-t border-black/5">
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">{title}</label>
      <div className="space-y-2">
        {list.map((item, idx) => (
          <div key={idx} className="flex gap-2 group">
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...list];
                next[idx] = e.target.value;
                updateElement(id, { [propKey]: next });
              }}
              placeholder={placeholder}
              className="flex-1 glass-input transition-all group-hover:border-black/20"
            />
            <button
              onClick={() => {
                const next = list.filter((_, i) => i !== idx);
                updateElement(id, { [propKey]: next });
              }}
              className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => updateElement(id, { [propKey]: [...list, defaultItem] })}
          className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium hover:border-black/20 hover:text-zinc-900 hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-2"
        >
          <Plus className="w-4 h-4" /> {addLabel}
        </button>
      </div>
    </div>
  );
}

interface ObjectArrayEditorProps<T> extends FieldProps {
  propKey: string;
  title: string;
  addLabel: string;
  defaultItem: T;
  renderFields: (item: T, idx: number, onChange: (patch: Partial<T>) => void) => React.ReactNode;
}

function ObjectArrayEditor<T>({ element, updateElement, propKey, title, addLabel, defaultItem, renderFields }: ObjectArrayEditorProps<T>) {
  const { props, id } = element;
  if (!(propKey in props)) return null;
  const list: T[] = props[propKey];

  return (
    <div className="pt-4 border-t border-black/5">
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">{title}</label>
      <div className="space-y-3">
        {list.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-start bg-white/50 p-3 rounded-2xl border border-black/5 shadow-sm group hover:border-black/10 transition-all">
            <div className="flex-1 space-y-2">
              {renderFields(item, idx, (patch) => {
                const next = [...list];
                next[idx] = { ...next[idx], ...patch };
                updateElement(id, { [propKey]: next });
              })}
            </div>
            <button
              onClick={() => {
                const next = list.filter((_, i) => i !== idx);
                updateElement(id, { [propKey]: next });
              }}
              className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors mt-1 opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => updateElement(id, { [propKey]: [...list, defaultItem] })}
          className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium hover:border-black/20 hover:text-zinc-900 hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-2"
        >
          <Plus className="w-4 h-4" /> {addLabel}
        </button>
      </div>
    </div>
  );
}

export function ArrayEditors({ element, updateElement }: FieldProps) {
  return (
    <>
      <StringArrayEditor
        element={element}
        updateElement={updateElement}
        propKey="links"
        title="Links do Menu"
        addLabel="Adicionar Link"
        defaultItem="Novo Link"
      />

      <StringArrayEditor
        element={element}
        updateElement={updateElement}
        propKey="images"
        title="Imagens da Galeria"
        placeholder="URL da Imagem"
        addLabel="Adicionar Imagem"
        defaultItem="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop"
      />

      <ObjectArrayEditor<{ title: string; desc: string; image: string }>
        element={element}
        updateElement={updateElement}
        propKey="slides"
        title="Slides"
        addLabel="Adicionar Slide"
        defaultItem={{ title: 'Novo Slide', desc: 'Descrição', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop' }}
        renderFields={(slide, _idx, onChange) => (
          <>
            <input type="text" placeholder="URL da Imagem" value={slide.image} onChange={(e) => onChange({ image: e.target.value })} className="glass-input" />
            <input type="text" placeholder="Título" value={slide.title} onChange={(e) => onChange({ title: e.target.value })} className="glass-input font-medium" />
            <textarea placeholder="Descrição" value={slide.desc} onChange={(e) => onChange({ desc: e.target.value })} className="glass-input min-h-[60px] resize-y" />
          </>
        )}
      />

      <ObjectArrayEditor<{ title: string; desc: string }>
        element={element}
        updateElement={updateElement}
        propKey="features"
        title="Colunas / Recursos"
        addLabel="Adicionar Coluna"
        defaultItem={{ title: 'Novo Recurso', desc: 'Descrição' }}
        renderFields={(feature, _idx, onChange) => (
          <>
            <input type="text" placeholder="Título" value={feature.title} onChange={(e) => onChange({ title: e.target.value })} className="glass-input font-medium" />
            <textarea placeholder="Descrição" value={feature.desc} onChange={(e) => onChange({ desc: e.target.value })} className="glass-input min-h-[60px] resize-y" />
          </>
        )}
      />

      <StringArrayEditor
        element={element}
        updateElement={updateElement}
        propKey="items"
        title="Itens da Lista"
        addLabel="Adicionar Item"
        defaultItem="Novo Item"
      />

      <ObjectArrayEditor<{ name: string; value: string }>
        element={element}
        updateElement={updateElement}
        propKey="stages"
        title="Estágios do Funil"
        addLabel="Adicionar Estágio"
        defaultItem={{ name: 'Novo Estágio', value: '0' }}
        renderFields={(stage, _idx, onChange) => (
          <>
            <input type="text" placeholder="Nome" value={stage.name} onChange={(e) => onChange({ name: e.target.value })} className="glass-input" />
            <input type="text" placeholder="Valor" value={stage.value} onChange={(e) => onChange({ value: e.target.value })} className="glass-input font-medium" />
          </>
        )}
      />

      <ObjectArrayEditor<{ title: string; desc: string }>
        element={element}
        updateElement={updateElement}
        propKey="steps"
        title="Passos da Linha do Tempo"
        addLabel="Adicionar Passo"
        defaultItem={{ title: 'Novo Passo', desc: 'Descrição do passo' }}
        renderFields={(step, _idx, onChange) => (
          <>
            <input type="text" placeholder="Título" value={step.title} onChange={(e) => onChange({ title: e.target.value })} className="glass-input font-medium" />
            <textarea placeholder="Descrição" value={step.desc} onChange={(e) => onChange({ desc: e.target.value })} className="glass-input min-h-[60px] resize-y" />
          </>
        )}
      />
    </>
  );
}

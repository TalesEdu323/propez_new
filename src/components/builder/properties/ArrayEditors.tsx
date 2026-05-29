import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FieldProps } from './TextFields';
import { IconPickerField } from './IconPickerField';
import { normalizeIconItem, type IconListItem } from '../icons/normalizeIconItem';
import { DEFAULT_LIST_ICON } from '../icons/iconCatalog';

interface StringArrayEditorProps extends FieldProps {
  propKey: 'links' | 'images' | 'items' | 'paragraphs' | 'columns';
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
            <button type="button" onClick={() => updateElement(id, { [propKey]: list.filter((_, i) => i !== idx) })} className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => updateElement(id, { [propKey]: [...list, defaultItem] })} className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium hover:border-black/20 hover:text-zinc-900 hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-2">
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
            <button type="button" onClick={() => updateElement(id, { [propKey]: list.filter((_, i) => i !== idx) })} className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors mt-1 opacity-0 group-hover:opacity-100">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => updateElement(id, { [propKey]: [...list, defaultItem] })} className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium hover:border-black/20 hover:text-zinc-900 hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-2">
          <Plus className="w-4 h-4" /> {addLabel}
        </button>
      </div>
    </div>
  );
}

function IconListItemsEditor({ element, updateElement, listIcon }: FieldProps & { listIcon?: string }) {
  const { type, props, id } = element;
  if (type !== 'icon_list' || !('items' in props)) return null;
  const fallback = listIcon ?? (props.listIcon as string) ?? DEFAULT_LIST_ICON;
  const raw: Array<string | IconListItem> = props.items ?? [];

  const setItems = (next: IconListItem[]) => updateElement(id, { items: next });

  return (
    <div className="pt-4 border-t border-black/5">
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Itens da lista</label>
      <div className="space-y-3">
        {raw.map((item, idx) => {
          const norm = normalizeIconItem(item, fallback);
          return (
            <div key={idx} className="flex gap-2 items-start bg-white/50 p-3 rounded-2xl border border-black/5">
              <IconPickerField compact value={norm.icon} onChange={(iconId) => {
                const next = raw.map((it, i) => normalizeIconItem(i === idx ? { ...norm, icon: iconId } : it, fallback));
                setItems(next);
              }} />
              <input type="text" value={norm.text} onChange={(e) => {
                const next = raw.map((it, i) => normalizeIconItem(i === idx ? { ...norm, text: e.target.value } : it, fallback));
                setItems(next);
              }} className="flex-1 glass-input" placeholder="Texto do item" />
              <button type="button" onClick={() => setItems(raw.filter((_, i) => i !== idx).map((it) => normalizeIconItem(it, fallback)))} className="p-2 text-red-400 hover:bg-red-50 rounded-xl">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        <button type="button" onClick={() => setItems([...raw.map((it) => normalizeIconItem(it, fallback)), { text: 'Novo item', icon: fallback }])} className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar item
        </button>
      </div>
    </div>
  );
}

function PricingItemsEditor({ element, updateElement, listIcon }: FieldProps & { listIcon?: string }) {
  const { type, props, id } = element;
  if (type !== 'pricing' && type !== 'marketing_pricing') return null;
  if (!('items' in props)) return null;
  const fallback = listIcon ?? (props.listIcon as string) ?? DEFAULT_LIST_ICON;
  const raw: Array<string | IconListItem> = props.items ?? [];

  const setItems = (next: IconListItem[]) => updateElement(id, { items: next });

  return (
    <div className="pt-4 border-t border-black/5">
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Itens incluídos</label>
      <div className="space-y-3">
        {raw.map((item, idx) => {
          const norm = normalizeIconItem(item, fallback);
          return (
            <div key={idx} className="flex gap-2 items-center">
              <IconPickerField compact value={norm.icon} onChange={(iconId) => {
                const next = raw.map((it, i) => normalizeIconItem(i === idx ? { ...norm, icon: iconId } : it, fallback));
                setItems(next);
              }} />
              <input type="text" value={norm.text} onChange={(e) => {
                const next = raw.map((it, i) => normalizeIconItem(i === idx ? { ...norm, text: e.target.value } : it, fallback));
                setItems(next);
              }} className="flex-1 glass-input text-sm" />
              <button type="button" onClick={() => setItems(raw.filter((_, i) => i !== idx).map((it) => normalizeIconItem(it, fallback)))} className="p-2 text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        <button type="button" onClick={() => setItems([...raw.map((it) => normalizeIconItem(it, fallback)), { text: 'Novo benefício', icon: fallback }])} className="w-full py-2 border border-dashed rounded-xl text-sm text-zinc-500 flex justify-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>
    </div>
  );
}

export function ArrayEditors({ element, updateElement, listIcon }: FieldProps & { listIcon?: string }) {
  const { type } = element;

  if (type === 'icon_list') {
    return <IconListItemsEditor element={element} updateElement={updateElement} listIcon={listIcon} />;
  }

  if (type === 'pricing' || type === 'marketing_pricing') {
    return <PricingItemsEditor element={element} updateElement={updateElement} listIcon={listIcon} />;
  }

  if (type === 'stats') {
    return (
      <ObjectArrayEditor<{ value: string; label: string; suffix?: string; color?: string }>
        element={element} updateElement={updateElement} propKey="items" title="Métricas" addLabel="Adicionar métrica"
        defaultItem={{ value: '100', label: 'Nova métrica', suffix: '%', color: '#dc2626' }}
        renderFields={(item, _idx, onChange) => (
          <>
            <input type="text" placeholder="Valor" value={item.value} onChange={(e) => onChange({ value: e.target.value })} className="glass-input font-bold" />
            <input type="text" placeholder="Rótulo" value={item.label} onChange={(e) => onChange({ label: e.target.value })} className="glass-input" />
            <input type="text" placeholder="Sufixo (opcional)" value={item.suffix ?? ''} onChange={(e) => onChange({ suffix: e.target.value })} className="glass-input text-sm" />
          </>
        )}
      />
    );
  }

  if (type === 'accordion') {
    return (
      <ObjectArrayEditor<{ title: string; content: string }>
        element={element} updateElement={updateElement} propKey="items" title="Perguntas FAQ" addLabel="Adicionar pergunta"
        defaultItem={{ title: 'Nova pergunta', content: 'Resposta aqui.' }}
        renderFields={(item, _idx, onChange) => (
          <>
            <input type="text" placeholder="Pergunta" value={item.title} onChange={(e) => onChange({ title: e.target.value })} className="glass-input font-medium" />
            <textarea placeholder="Resposta" value={item.content} onChange={(e) => onChange({ content: e.target.value })} className="glass-input min-h-[60px] resize-y" />
          </>
        )}
      />
    );
  }

  if (type === 'comparison_table') {
    return (
      <>
        <StringArrayEditor element={element} updateElement={updateElement} propKey="columns" title="Colunas" addLabel="Adicionar coluna" defaultItem="Coluna" />
        <ObjectArrayEditor<{ feature: string; us: string; them: string }>
          element={element} updateElement={updateElement} propKey="rows" title="Linhas comparativas" addLabel="Adicionar linha"
          defaultItem={{ feature: 'Recurso', us: 'Sim', them: 'Não' }}
          renderFields={(row, _idx, onChange) => (
            <>
              <input type="text" placeholder="Recurso" value={row.feature} onChange={(e) => onChange({ feature: e.target.value })} className="glass-input" />
              <input type="text" placeholder="Coluna 2" value={row.us} onChange={(e) => onChange({ us: e.target.value })} className="glass-input text-sm" />
              <input type="text" placeholder="Coluna 3" value={row.them} onChange={(e) => onChange({ them: e.target.value })} className="glass-input text-sm" />
            </>
          )}
        />
      </>
    );
  }

  if (type === 'marketing_context') {
    return (
      <>
        <StringArrayEditor element={element} updateElement={updateElement} propKey="paragraphs" title="Parágrafos" placeholder="Parágrafo" addLabel="Adicionar parágrafo" defaultItem="Novo parágrafo de contexto." />
        <ObjectArrayEditor<{ value: string; label: string }>
          element={element} updateElement={updateElement} propKey="stats" title="Estatísticas" addLabel="Adicionar stat"
          defaultItem={{ value: '10', label: 'Métrica' }}
          renderFields={(stat, _idx, onChange) => (
            <>
              <input type="text" placeholder="Valor" value={stat.value} onChange={(e) => onChange({ value: e.target.value })} className="glass-input font-bold" />
              <input type="text" placeholder="Rótulo" value={stat.label} onChange={(e) => onChange({ label: e.target.value })} className="glass-input" />
            </>
          )}
        />
        <ObjectArrayEditor<{ title: string; desc: string; icon?: string }>
          element={element} updateElement={updateElement} propKey="challenges" title="Desafios" addLabel="Adicionar desafio"
          defaultItem={{ title: 'Novo desafio', desc: 'Descrição', icon: 'AlertCircle' }}
          renderFields={(ch, _idx, onChange) => (
            <>
              <IconPickerField compact value={ch.icon ?? 'AlertCircle'} onChange={(iconId) => onChange({ icon: iconId })} />
              <input type="text" placeholder="Título" value={ch.title} onChange={(e) => onChange({ title: e.target.value })} className="glass-input font-medium" />
              <textarea placeholder="Descrição" value={ch.desc} onChange={(e) => onChange({ desc: e.target.value })} className="glass-input min-h-[60px] resize-y" />
            </>
          )}
        />
      </>
    );
  }

  if (type === 'marketing_strategy') {
    return (
      <ObjectArrayEditor<{ title: string; desc: string; letra?: string }>
        element={element} updateElement={updateElement} propKey="steps" title="Etapas da estratégia" addLabel="Adicionar etapa"
        defaultItem={{ title: 'Nova etapa', desc: 'Descrição da etapa.', letra: 'A' }}
        renderFields={(step, _idx, onChange) => (
          <>
            <input type="text" placeholder="Letra (opcional)" value={step.letra ?? ''} onChange={(e) => onChange({ letra: e.target.value })} className="glass-input w-16" />
            <input type="text" placeholder="Título" value={step.title} onChange={(e) => onChange({ title: e.target.value })} className="glass-input font-medium" />
            <textarea placeholder="Descrição" value={step.desc} onChange={(e) => onChange({ desc: e.target.value })} className="glass-input min-h-[60px] resize-y" />
          </>
        )}
      />
    );
  }

  return (
    <>
      <StringArrayEditor element={element} updateElement={updateElement} propKey="links" title="Links do Menu" addLabel="Adicionar Link" defaultItem="Novo Link" />
      <StringArrayEditor element={element} updateElement={updateElement} propKey="images" title="Imagens da Galeria" placeholder="URL da Imagem" addLabel="Adicionar Imagem" defaultItem="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop" />

      <ObjectArrayEditor<{ title: string; desc: string; image: string }>
        element={element} updateElement={updateElement} propKey="slides" title="Slides" addLabel="Adicionar Slide"
        defaultItem={{ title: 'Novo Slide', desc: 'Descrição', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop' }}
        renderFields={(slide, _idx, onChange) => (
          <>
            <input type="text" placeholder="URL da Imagem" value={slide.image} onChange={(e) => onChange({ image: e.target.value })} className="glass-input" />
            <input type="text" placeholder="Título" value={slide.title} onChange={(e) => onChange({ title: e.target.value })} className="glass-input font-medium" />
            <textarea placeholder="Descrição" value={slide.desc} onChange={(e) => onChange({ desc: e.target.value })} className="glass-input min-h-[60px] resize-y" />
          </>
        )}
      />

      <ObjectArrayEditor<{ title: string; desc: string; icon?: string }>
        element={element} updateElement={updateElement} propKey="features" title="Colunas / Recursos" addLabel="Adicionar Coluna"
        defaultItem={{ title: 'Novo Recurso', desc: 'Descrição', icon: 'Sparkles' }}
        renderFields={(feature, _idx, onChange) => (
          <>
            <IconPickerField compact value={feature.icon ?? 'Sparkles'} onChange={(iconId) => onChange({ icon: iconId })} />
            <input type="text" placeholder="Título" value={feature.title} onChange={(e) => onChange({ title: e.target.value })} className="glass-input font-medium" />
            <textarea placeholder="Descrição" value={feature.desc} onChange={(e) => onChange({ desc: e.target.value })} className="glass-input min-h-[60px] resize-y" />
          </>
        )}
      />

      <ObjectArrayEditor<{ name: string; value: string }>
        element={element} updateElement={updateElement} propKey="stages" title="Estágios do Funil" addLabel="Adicionar Estágio"
        defaultItem={{ name: 'Novo Estágio', value: '0' }}
        renderFields={(stage, _idx, onChange) => (
          <>
            <input type="text" placeholder="Nome" value={stage.name} onChange={(e) => onChange({ name: e.target.value })} className="glass-input" />
            <input type="text" placeholder="Valor" value={stage.value} onChange={(e) => onChange({ value: e.target.value })} className="glass-input font-medium" />
          </>
        )}
      />

      <ObjectArrayEditor<{ title: string; desc: string }>
        element={element} updateElement={updateElement} propKey="steps" title="Passos da Linha do Tempo" addLabel="Adicionar Passo"
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

import { ALIGN_OPTIONS, ANIMATION_OPTIONS } from '../constants';
import type { FieldProps } from './TextFields';

export function AlignField({ element, updateElement }: FieldProps) {
  const { props, id } = element;
  if (!('align' in props)) return null;
  return (
    <div>
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Alinhamento</label>
      <div className="flex bg-zinc-100 rounded-xl p-1 border border-black/5">
        {ALIGN_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => updateElement(id, { align: opt.value })}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${props.align === opt.value ? 'bg-white shadow-sm border border-black/5 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-black/5'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LayoutFields({ element, updateElement }: FieldProps) {
  const { type, props, id } = element;

  return (
    <>
      {('position' in props) && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Posição</label>
          <select value={props.position} onChange={(e) => updateElement(id, { position: e.target.value })} className="glass-input appearance-none cursor-pointer">
            <option value="bottom-right">Inferior Direito</option>
            <option value="bottom-left">Inferior Esquerdo</option>
            <option value="top-right">Superior Direito</option>
            <option value="top-left">Superior Esquerdo</option>
          </select>
        </div>
      )}

      {('columns' in props) && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Colunas</label>
          <select value={props.columns} onChange={(e) => updateElement(id, { columns: e.target.value })} className="glass-input appearance-none cursor-pointer">
            <option value="1">1 Coluna</option>
            <option value="2">2 Colunas</option>
            <option value="3">3 Colunas</option>
            <option value="4">4 Colunas</option>
            {type === 'grid' && <option value="5">5 Colunas</option>}
            {type === 'grid' && <option value="6">6 Colunas</option>}
          </select>
        </div>
      )}

      {('size' in props) && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Tamanho do Texto</label>
          <select value={props.size} onChange={(e) => updateElement(id, { size: e.target.value })} className="glass-input appearance-none cursor-pointer">
            <option value="text-sm">Pequeno</option>
            <option value="text-base">Normal</option>
            <option value="text-xl">Grande</option>
            <option value="text-3xl">Muito Grande</option>
            <option value="text-5xl">Gigante</option>
            <option value="text-7xl">Titã</option>
          </select>
        </div>
      )}

      {('radius' in props) && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Arredondamento</label>
          <select value={props.radius} onChange={(e) => updateElement(id, { radius: e.target.value })} className="glass-input appearance-none cursor-pointer">
            <option value="rounded-none">Quadrado</option>
            <option value="rounded-md">Suave</option>
            <option value="rounded-xl">Arredondado</option>
            <option value="rounded-2xl">Muito Arredondado</option>
            <option value="rounded-full">Pílula</option>
          </select>
        </div>
      )}

      {('shadow' in props) && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Sombra</label>
          <select value={props.shadow} onChange={(e) => updateElement(id, { shadow: e.target.value })} className="glass-input appearance-none cursor-pointer">
            <option value="shadow-none">Sem Sombra</option>
            <option value="shadow-sm">Pequena</option>
            <option value="shadow-md">Média</option>
            <option value="shadow-lg">Grande</option>
            <option value="shadow-xl">Extra Grande</option>
          </select>
        </div>
      )}

      {('animation' in props) && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Animação</label>
          <select value={props.animation} onChange={(e) => updateElement(id, { animation: e.target.value })} className="glass-input appearance-none cursor-pointer">
            {ANIMATION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      )}

      {('style' in props) && type === 'divider' && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Estilo da Linha</label>
          <select value={props.style} onChange={(e) => updateElement(id, { style: e.target.value })} className="glass-input appearance-none cursor-pointer">
            <option value="solid">Sólida</option>
            <option value="dashed">Tracejada</option>
            <option value="dotted">Pontilhada</option>
          </select>
        </div>
      )}

      {('gap' in props) && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Espaçamento (px)</label>
          <input type="number" min="0" max="100" value={props.gap} onChange={(e) => updateElement(id, { gap: e.target.value })} className="glass-input" />
        </div>
      )}

      {('padding' in props) && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Padding Interno (px)</label>
          <input type="number" min="0" max="100" value={props.padding} onChange={(e) => updateElement(id, { padding: e.target.value })} className="glass-input" />
        </div>
      )}

      {('thickness' in props) && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Espessura (px)</label>
          <input type="number" min="1" max="20" value={props.thickness} onChange={(e) => updateElement(id, { thickness: e.target.value })} className="glass-input" />
        </div>
      )}

      {('height' in props) && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex justify-between">
            <span>Altura (px)</span>
            <span className="text-zinc-400">{props.height}px</span>
          </label>
          <input type="range" min="10" max="800" value={props.height} onChange={(e) => updateElement(id, { height: e.target.value })} className="w-full accent-blue-500" />
        </div>
      )}
    </>
  );
}

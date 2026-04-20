import type { BuilderElement } from '../../../types/builder';

export interface FieldProps {
  element: BuilderElement;
  updateElement: (id: string, patch: Record<string, any>) => void;
}

const TEXT_INPUT_KEYS = [
  'text', 'title', 'label', 'value', 'suffix', 'buttonText', 'price', 'period',
  'quote', 'author', 'role', 'logoText', 'expiredText', 'percentage', 'rating',
  'maxStars', 'size', 'address', 'zoom', 'name', 'action', 'timeAgo', 'height',
] as const;

const TEXT_LABELS: Record<string, string> = {
  text: 'Texto', title: 'Título', label: 'Rótulo', value: 'Valor', suffix: 'Sufixo',
  buttonText: 'Texto do Botão', price: 'Preço', period: 'Período', quote: 'Citação',
  author: 'Autor', role: 'Cargo', logoText: 'Texto da Logo', expiredText: 'Texto Expirado',
  percentage: 'Porcentagem', rating: 'Avaliação', maxStars: 'Máx. Estrelas',
  size: 'Tamanho', address: 'Endereço', zoom: 'Zoom', name: 'Nome', action: 'Ação',
  timeAgo: 'Tempo Atrás', height: 'Altura',
};

export function TextFields({ element, updateElement }: FieldProps) {
  const { type, props, id } = element;
  return (
    <>
      {TEXT_INPUT_KEYS.map(propKey => (
        propKey in props && (
          <div key={propKey}>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              {TEXT_LABELS[propKey] ?? propKey}
            </label>
            {type === 'paragraph' && propKey === 'text' ? (
              <textarea
                value={props[propKey]}
                onChange={(e) => updateElement(id, { [propKey]: e.target.value })}
                className="glass-input min-h-[100px] resize-y"
              />
            ) : type === 'testimonial' && propKey === 'quote' ? (
              <textarea
                value={props[propKey]}
                onChange={(e) => updateElement(id, { [propKey]: e.target.value })}
                className="glass-input min-h-[80px] resize-y"
              />
            ) : (
              <input
                type="text"
                value={props[propKey]}
                onChange={(e) => updateElement(id, { [propKey]: e.target.value })}
                className="glass-input"
              />
            )}
          </div>
        )
      ))}
    </>
  );
}

export function DateTimeFields({ element, updateElement }: FieldProps) {
  const { props, id } = element;
  return (
    <>
      {(['targetDate', 'targetTime'] as const).map(propKey => (
        propKey in props && (
          <div key={propKey}>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              {propKey === 'targetDate' ? 'Data Alvo' : 'Hora Alvo'}
            </label>
            <input
              type={propKey === 'targetDate' ? 'date' : 'time'}
              value={props[propKey]}
              onChange={(e) => updateElement(id, { [propKey]: e.target.value })}
              className="glass-input"
            />
          </div>
        )
      ))}
    </>
  );
}

export function DescriptionFields({ element, updateElement }: FieldProps) {
  const { props, id } = element;
  return (
    <>
      {(['description', 'content'] as const).map(propKey => (
        propKey in props && (
          <div key={propKey}>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              {propKey === 'description' ? 'Descrição' : 'Conteúdo'}
            </label>
            <textarea
              value={props[propKey]}
              onChange={(e) => updateElement(id, { [propKey]: e.target.value })}
              className="glass-input min-h-[80px] resize-y"
            />
          </div>
        )
      ))}
    </>
  );
}

export function UrlFields({ element, updateElement }: FieldProps) {
  const { type, props, id } = element;
  return (
    <>
      {(['url', 'imageUrl', 'avatarUrl', 'link'] as const).map(propKey => (
        propKey in props && (
          <div key={propKey}>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              URL da {propKey === 'imageUrl' ? 'Imagem' : propKey === 'avatarUrl' ? 'Avatar' : propKey === 'link' ? 'Link' : type === 'video' ? 'Vídeo (Embed)' : 'Mídia'}
            </label>
            <input
              type="text"
              value={props[propKey]}
              onChange={(e) => updateElement(id, { [propKey]: e.target.value })}
              className="glass-input"
            />
          </div>
        )
      ))}
    </>
  );
}

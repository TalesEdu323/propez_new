import { useState } from 'react';
import { Sparkles, Loader2, Link2, ImageIcon } from 'lucide-react';
import { iaApi, getIaErrorMessage } from '../../../lib/iaApi';
import type { BuilderElement } from '../../../types/builder';

type ImageSourceTab = 'url' | 'generate' | 'stock';

export interface ImageSourceFieldProps {
  element: BuilderElement;
  updateElement: (id: string, patch: Record<string, unknown>) => void;
}

export function ImageSourceField({ element, updateElement }: ImageSourceFieldProps) {
  const { id, props } = element;
  const [tab, setTab] = useState<ImageSourceTab>('url');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!('url' in props)) return null;

  const url = String(props.url ?? '');

  const applyUrl = (nextUrl: string, alt?: string) => {
    updateElement(id, {
      url: nextUrl,
      ...(alt ? { alt: alt.slice(0, 120) } : {}),
    });
  };

  const handleGenerate = async (source: 'generate' | 'stock') => {
    const trimmed = prompt.trim();
    if (trimmed.length < 10) {
      setError('Descreva a imagem com pelo menos 10 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await iaApi.generateImage(trimmed, { source });
      applyUrl(result.url, trimmed);
      setTab('url');
    } catch (err) {
      setError(getIaErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: ImageSourceTab; label: string; icon: typeof Link2 }[] = [
    { id: 'url', label: 'URL', icon: Link2 },
    { id: 'generate', label: 'Gerar IA', icon: Sparkles },
    { id: 'stock', label: 'Stock', icon: ImageIcon },
  ];

  return (
    <div className="space-y-3 p-3 rounded-xl border border-black/5 bg-zinc-50/80">
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Fonte da imagem</p>

      <div className="flex gap-1 p-1 bg-white rounded-lg border border-black/5">
        {tabs.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            type="button"
            onClick={() => {
              setTab(tabId);
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-colors ${
              tab === tabId
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'url' && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            URL da mídia
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => updateElement(id, { url: e.target.value })}
            className="glass-input"
            placeholder="https://image.pollinations.ai/... ou outra URL"
          />
        </div>
      )}

      {(tab === 'generate' || tab === 'stock') && (
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            {tab === 'generate' ? 'Descreva a imagem a gerar' : 'Buscar foto stock'}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={loading}
            className="glass-input min-h-[72px] resize-y disabled:opacity-60"
            placeholder={
              tab === 'generate'
                ? 'Ex.: Equipe em reunião em escritório moderno, luz natural, estilo corporativo'
                : 'Ex.: business team meeting office'
            }
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleGenerate(tab === 'generate' ? 'generate' : 'stock')}
            className="w-full py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {tab === 'generate' ? 'Gerando...' : 'Buscando...'}
              </>
            ) : (
              <>
                {tab === 'generate' ? <Sparkles className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                {tab === 'generate' ? 'Gerar imagem' : 'Buscar stock'}
              </>
            )}
          </button>
          {tab === 'generate' ? (
            <p className="text-[10px] text-zinc-400">Pode levar 10–30 segundos.</p>
          ) : null}
        </div>
      )}

      {url ? (
        <div className="rounded-lg overflow-hidden border border-black/5 bg-white">
          <img src={url} alt={String(props.alt ?? 'Preview')} className="w-full h-28 object-cover" />
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

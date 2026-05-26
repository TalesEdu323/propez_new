import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { LayoutTemplate, Eye, Download } from 'lucide-react';
import { api } from '../lib/apiClient';
import { RenderElement } from '../components/builder/RenderElement';
import type { BuilderElement } from '../types/builder';
import type { NavigateFn } from '../types/navigation';

interface MarketplaceTemplate {
  id: string;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  previewImageUrl?: string | null;
  elementos: BuilderElement[];
  tier: string;
}

export default function LojaTemplates({ navigate }: { navigate: NavigateFn }) {
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<MarketplaceTemplate | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.get<MarketplaceTemplate[]>('/api/marketplace/templates');
        setTemplates(list ?? []);
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUse = async (id: string) => {
    setCloning(id);
    try {
      const modelo = await api.post<{ id: string }>(`/api/marketplace/templates/${id}/clone`, {});
      navigate('criar-modelo', { editId: modelo.id });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao usar template');
    } finally {
      setCloning(null);
    }
  };

  return (
    <div className="page-container py-10">
      <header className="mb-10">
        <h1 className="page-title font-bold">Loja de templates</h1>
        <p className="text-zinc-500 mt-2">Modelos publicados pela plataforma. Use um template para copiar para sua organização.</p>
      </header>

      {loading ? (
        <p className="text-zinc-500">Carregando…</p>
      ) : templates.length === 0 ? (
        <p className="text-zinc-500">Nenhum template publicado no momento.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <motion.div
              key={t.id}
              className="apple-card p-6 flex flex-col"
              whileHover={{ y: -4 }}
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-4">
                <LayoutTemplate className="w-6 h-6" />
              </div>
              {t.categoria && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t.categoria}</span>
              )}
              <h3 className="text-lg font-bold text-zinc-900 mt-1">{t.nome}</h3>
              <p className="text-sm text-zinc-500 mt-2 flex-1 line-clamp-3">{t.descricao || 'Sem descrição'}</p>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setPreview(t)}
                  className="flex-1 btn-secondary text-sm justify-center"
                >
                  <Eye className="w-4 h-4" /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => handleUse(t.id)}
                  disabled={cloning === t.id}
                  className="flex-1 btn-primary text-sm justify-center"
                >
                  <Download className="w-4 h-4" />
                  {cloning === t.id ? '…' : 'Usar'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-black/5 p-4 flex justify-between items-center">
              <h2 className="font-bold text-lg">{preview.nome}</h2>
              <button type="button" onClick={() => setPreview(null)} className="text-sm text-zinc-500">
                Fechar
              </button>
            </div>
            <div className="p-0">
              {preview.elementos.map((el) => (
                <RenderElement key={el.id} element={el} previewMode />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

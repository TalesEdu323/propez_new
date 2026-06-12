import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../lib/apiClient';
import type { NavigateFn } from '../../types/navigation';

interface PostRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  updated_at: string;
}

export default function AdminBlogList({ navigate }: { navigate: NavigateFn }) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get<{ posts: PostRow[] }>('/api/admin/posts')
      .then((d) => {
        setPosts(d.posts);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm('Excluir este artigo?')) return;
    try {
      await api.delete(`/api/admin/posts/${id}`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Erro ao excluir');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Blog</h1>
          <p className="text-sm text-zinc-500 mt-1">Artigos publicados no site de vendas.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('admin-blog-editor', {})}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Novo artigo
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-zinc-400">Carregando...</p>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-zinc-400 text-[10px] uppercase tracking-widest">
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Atualizado</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-zinc-900">{p.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                        p.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {p.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(p.updated_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('admin-blog-editor', { postId: p.id })}
                        className="p-2 rounded-lg hover:bg-zinc-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(p.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {posts.length === 0 && (
            <p className="p-8 text-center text-zinc-400">Nenhum artigo ainda.</p>
          )}
        </div>
      )}
    </div>
  );
}

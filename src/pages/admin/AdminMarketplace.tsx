import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/apiClient';
import AdminPageShell from './AdminPageShell';
import type { NavigateFn } from '../../types/navigation';
import { STARTER_TEMPLATES } from '../../data/starterTemplates';

interface TemplateRow {
  id: string;
  slug: string;
  nome: string;
  published: boolean;
  sortOrder: number;
}

export default function AdminMarketplace({ navigate }: { navigate: NavigateFn }) {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get<TemplateRow[]>('/api/admin/marketplace/templates');
      setRows(list ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const seedStarters = async () => {
    for (const [i, t] of STARTER_TEMPLATES.entries()) {
      await api.post('/api/admin/marketplace/templates', {
        slug: t.id,
        nome: t.nome,
        descricao: t.descricao,
        categoria: t.categoria,
        elementos: t.elementos,
        fluxo: t.fluxo,
        tier: 'free',
        published: true,
        sort_order: i,
      }).catch(() => {});
    }
    void load();
  };

  const togglePublish = async (row: TemplateRow) => {
    await api.patch(`/api/admin/marketplace/templates/${row.id}`, {
      published: !row.published,
    });
    void load();
  };

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-marketplace"
      title="Loja de templates"
      subtitle="Publicar modelos globais para todas as organizações"
      onRefresh={load}
      refreshing={loading}
    >
      <div className="mb-6 flex gap-3">
        <button type="button" onClick={seedStarters} className="btn-secondary text-sm">
          Publicar 3 templates iniciais
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500">Carregando…</p>
      ) : (
        <div className="apple-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-zinc-500">
                <th className="p-4">Nome</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Ordem</th>
                <th className="p-4">Publicado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-black/5">
                  <td className="p-4 font-medium">{r.nome}</td>
                  <td className="p-4 text-zinc-500">{r.slug}</td>
                  <td className="p-4">{r.sortOrder}</td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => togglePublish(r)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        r.published ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {r.published ? 'Publicado' : 'Rascunho'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="p-8 text-center text-zinc-500">Nenhum template. Use o botão acima para criar os iniciais.</p>
          )}
        </div>
      )}
    </AdminPageShell>
  );
}

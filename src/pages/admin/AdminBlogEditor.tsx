import { useEffect, useState } from 'react';
import { ChevronLeft, Plus, Trash2, Save } from 'lucide-react';
import { api, ApiError } from '../../lib/apiClient';
import type { NavigateFn } from '../../types/navigation';
import type { BlogContentBlock } from '../../marketing/blog/blockTypes';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export default function AdminBlogEditor({
  navigate,
  postId,
}: {
  navigate: NavigateFn;
  postId?: string;
}) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [content, setContent] = useState<BlogContentBlock[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!postId);

  useEffect(() => {
    if (!postId) return;
    api
      .get<{ post: Record<string, unknown> }>(`/api/admin/posts/${postId}`)
      .then((d) => {
        const p = d.post;
        setTitle(String(p.title ?? ''));
        setSlug(String(p.slug ?? ''));
        setSummary(String(p.summary ?? ''));
        setCoverImage(String(p.cover_image ?? ''));
        setAuthorName(String(p.author_name ?? ''));
        setStatus((p.status as 'draft' | 'published') ?? 'draft');
        setContent((p.content as BlogContentBlock[]) ?? []);
        setTags((p.tags as string[]) ?? []);
      })
      .catch(() => alert('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [postId]);

  const addBlock = (type: 'text' | 'image_text') => {
    if (type === 'text') {
      setContent((c) => [...c, { type: 'text', data: { html: '<p></p>' } }]);
    } else {
      setContent((c) => [
        ...c,
        { type: 'image_text', data: { text: '<p></p>', image_url: '', image_position: 'left', image_ratio: '50-50' } },
      ]);
    }
  };

  const save = async () => {
    setSaving(true);
    const body = {
      title,
      slug: slug || slugify(title),
      summary: summary || null,
      cover_image: coverImage || null,
      author_name: authorName || null,
      content,
      tags,
      status,
    };
    try {
      if (postId) {
        await api.patch(`/api/admin/posts/${postId}`, body);
      } else {
        await api.post('/api/admin/posts', body);
      }
      navigate('admin-blog');
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-8 text-zinc-400">Carregando...</p>;

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <button
        type="button"
        onClick={() => navigate('admin-blog')}
        className="flex items-center gap-2 text-sm text-zinc-500 mb-6"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>

      <h1 className="text-2xl font-bold mb-8">{postId ? 'Editar artigo' : 'Novo artigo'}</h1>

      <div className="space-y-4 bg-white rounded-2xl border border-black/5 p-6">
        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400">Título</label>
          <input
            className="glass-input w-full mt-1"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400">Slug (URL)</label>
          <input className="glass-input w-full mt-1" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400">Resumo</label>
          <textarea className="glass-input w-full mt-1 min-h-[80px]" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400">Capa (URL)</label>
          <input className="glass-input w-full mt-1" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400">Autor</label>
          <input className="glass-input w-full mt-1" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400">Status</label>
          <select
            className="glass-input w-full mt-1"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
          >
            <option value="draft">Rascunho</option>
            <option value="published">Publicado (dispara newsletter)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400">Tags</label>
          <div className="flex gap-2 mt-1">
            <input
              className="glass-input flex-1"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const t = tagInput.trim();
                  if (t && !tags.includes(t)) setTags([...tags, t]);
                  setTagInput('');
                }
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const t = tagInput.trim();
                if (t && !tags.includes(t)) setTags([...tags, t]);
                setTagInput('');
              }}
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((t) => (
              <span key={t} className="text-xs bg-zinc-100 px-2 py-1 rounded-full">
                {t}{' '}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))}>×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Blocos de conteúdo</h2>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={() => addBlock('text')}>
              <Plus className="w-3 h-3" /> Texto
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => addBlock('image_text')}>
              <Plus className="w-3 h-3" /> Imagem + texto
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {content.map((block, i) => (
            <div key={i} className="bg-white rounded-xl border border-black/5 p-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold uppercase text-zinc-400">{block.type}</span>
                <button
                  type="button"
                  onClick={() => setContent(content.filter((_, j) => j !== i))}
                  className="text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {block.type === 'text' ? (
                <textarea
                  className="glass-input w-full min-h-[120px] font-mono text-xs"
                  value={block.data.html ?? ''}
                  onChange={(e) => {
                    const next = [...content];
                    (next[i] as BlogContentBlock & { type: 'text' }).data.html = e.target.value;
                    setContent(next);
                  }}
                />
              ) : (
                <>
                  <input
                    className="glass-input w-full mb-2 text-xs"
                    placeholder="URL da imagem"
                    value={block.data.image_url ?? ''}
                    onChange={(e) => {
                      const next = [...content];
                      const b = next[i] as BlogContentBlock & { type: 'image_text' };
                      b.data.image_url = e.target.value;
                      setContent(next);
                    }}
                  />
                  <textarea
                    className="glass-input w-full min-h-[80px] font-mono text-xs"
                    value={block.data.text ?? ''}
                    onChange={(e) => {
                      const next = [...content];
                      const b = next[i] as BlogContentBlock & { type: 'image_text' };
                      b.data.text = e.target.value;
                      setContent(next);
                    }}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary mt-8">
        <Save className="w-4 h-4" />
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  );
}

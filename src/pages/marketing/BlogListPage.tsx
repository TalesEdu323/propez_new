import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { MarketingLayout } from '../../marketing/MarketingLayout';
import { PageMeta } from '../../marketing/PageMeta';
import { BlogNewsletterModal } from '../../marketing/BlogNewsletterModal';
import type { BlogPostSummary } from '../../marketing/blog/blockTypes';

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog/tags')
      .then((r) => r.json())
      .then((d) => setTags(d.tags || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (tag) q.set('tag', tag);
    fetch(`/api/blog/posts?${q}`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [search, tag]);

  return (
    <MarketingLayout>
      <PageMeta title="Blog" description="Artigos sobre propostas, vendas e produtividade." path="/blog" />
      <BlogNewsletterModal />
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Blog</h1>
          <p className="text-zinc-500 mb-8 max-w-xl">Artigos sobre propostas comerciais e processo de vendas.</p>

          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar artigos..."
                className="glass-input pl-10 w-full"
              />
            </div>
            {tags.length > 0 && (
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="glass-input max-w-[200px]"
              >
                <option value="">Todas as tags</option>
                {tags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>

          {loading ? (
            <p className="text-zinc-400">Carregando...</p>
          ) : posts.length === 0 ? (
            <p className="text-zinc-500">Nenhum artigo publicado ainda.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group rounded-2xl border border-black/5 overflow-hidden bg-white hover:shadow-lg transition-shadow"
                >
                  {post.cover_image && (
                    <img src={post.cover_image} alt="" className="w-full h-48 object-cover" />
                  )}
                  <div className="p-6">
                    <h2 className="font-semibold text-lg group-hover:text-zinc-600 transition-colors">{post.title}</h2>
                    {post.summary && <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{post.summary}</p>}
                    {post.published_at && (
                      <p className="text-xs text-zinc-400 mt-4">
                        {new Date(post.published_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}

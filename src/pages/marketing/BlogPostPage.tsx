import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { MarketingLayout } from '../../marketing/MarketingLayout';
import { PageMeta } from '../../marketing/PageMeta';
import { buildArticleJsonLd } from '../../marketing/articleJsonLd';
import { BlogPostContent } from '../../marketing/blog/BlogPostContent';
import { NewsletterSignup } from '../../marketing/NewsletterSignup';
import type { BlogPostDetail } from '../../marketing/blog/blockTypes';

function sessionId(): string {
  const key = 'propez_blog_sid';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID?.() ?? String(Date.now());
    sessionStorage.setItem(key, id);
  }
  return id;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [error, setError] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/blog/posts/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((d) => setPost(d.post))
      .catch(() => setError(true));
  }, [slug]);

  useEffect(() => {
    if (!post?.id) return;
    const sid = sessionId();
    void fetch('/api/blog/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, sessionId: sid, eventType: 'view' }),
    });
    return () => {
      const seconds = Math.round((Date.now() - startRef.current) / 1000);
      if (seconds > 2) {
        void fetch('/api/blog/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: post.id,
            sessionId: sid,
            eventType: 'time_on_page',
            eventData: { seconds },
          }),
        });
      }
    };
  }, [post?.id]);

  if (error) {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 py-24 text-center">
          <p className="text-zinc-500">Artigo não encontrado.</p>
          <Link to="/blog" className="text-sm font-semibold mt-4 inline-block">← Voltar ao blog</Link>
        </div>
      </MarketingLayout>
    );
  }

  if (!post) {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 py-24 text-center text-zinc-400">Carregando...</div>
      </MarketingLayout>
    );
  }

  const path = `/blog/${post.slug}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const articleUrl = origin ? `${origin}${path}` : path;
  const jsonLd = buildArticleJsonLd({
    title: post.title,
    description: post.summary || undefined,
    url: articleUrl,
    image: post.cover_image || undefined,
    datePublished: post.published_at || undefined,
    authorName: post.author_name || undefined,
  });

  return (
    <MarketingLayout>
      <PageMeta
        title={post.title}
        description={post.summary || undefined}
        path={path}
        image={post.cover_image || undefined}
        ogType="article"
        jsonLd={jsonLd}
      />
      <article className="py-12">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-8">
            <ChevronLeft className="w-4 h-4" /> Blog
          </Link>
          {post.cover_image && (
            <img src={post.cover_image} alt="" className="w-full rounded-2xl mb-8 max-h-[400px] object-cover" />
          )}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{post.title}</h1>
          {post.author_name && (
            <p className="text-sm text-zinc-500 mb-8">Por {post.author_name}</p>
          )}
          <BlogPostContent blocks={post.content || []} />
          <div className="mt-16 pt-8 border-t border-black/5">
            <h3 className="font-semibold mb-4">Receba novos artigos</h3>
            <NewsletterSignup />
          </div>
        </div>
      </article>
    </MarketingLayout>
  );
}

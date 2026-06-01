import type { Pool } from 'pg';

/** URLs indexáveis (sem login/cadastro/termos placeholder). */
export const SITEMAP_STATIC_PATHS = ['/', '/sobre-nos', '/planos', '/blog'] as const;

export function buildRobotsTxt(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `User-agent: *
Allow: /
Disallow: /app
Disallow: /api/
Disallow: /p/

Sitemap: ${base}/sitemap.xml
`;
}

export async function buildSitemapXml(pool: Pool, baseUrl: string): Promise<string> {
  const base = baseUrl.replace(/\/+$/, '');
  const staticUrls = SITEMAP_STATIC_PATHS.map(
    (p) => `  <url><loc>${base}${p}</loc><changefreq>weekly</changefreq></url>`,
  );

  let postUrls: string[] = [];
  try {
    const { rows } = await pool.query<{ slug: string; updated_at: string }>(
      `SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC`,
    );
    postUrls = rows.map(
      (r) =>
        `  <url><loc>${base}/blog/${r.slug}</loc><lastmod>${new Date(r.updated_at).toISOString().split('T')[0]}</lastmod></url>`,
    );
  } catch {
    // Tabela posts pode não existir em ambientes sem migração de blog
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...postUrls].join('\n')}
</urlset>`;
}

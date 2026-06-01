import { Helmet } from 'react-helmet-async';
import { DEFAULT_OG_IMAGE_PATH, SITE_NAME } from './seoConstants';

export type PageMetaOgType = 'website' | 'article';

export type PageMetaProps = {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  ogType?: PageMetaOgType;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

function resolveAbsoluteUrl(pathOrUrl: string | undefined, origin: string): string | undefined {
  if (!pathOrUrl) return undefined;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  if (!origin) return pathOrUrl;
  return `${origin}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function PageMeta({
  title,
  description,
  path,
  image,
  noindex = false,
  ogType = 'website',
  jsonLd,
}: PageMetaProps) {
  const fullTitle = title.includes('Propez') ? title : `${title} | Propez`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const canonical = path && origin ? `${origin}${path}` : undefined;
  const ogImage = resolveAbsoluteUrl(image ?? DEFAULT_OG_IMAGE_PATH, origin);

  const jsonLdBlocks = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}

      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="pt_BR" />
      {ogImage && <meta property="og:image" content={ogImage} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {jsonLdBlocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}

import { Helmet } from 'react-helmet-async';

type PageMetaProps = {
  title: string;
  description?: string;
  path?: string;
};

export function PageMeta({ title, description, path }: PageMetaProps) {
  const fullTitle = title.includes('Propez') ? title : `${title} | Propez`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = path && origin ? `${origin}${path}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {description && <meta property="og:title" content={fullTitle} />}
      {description && <meta property="og:description" content={description} />}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:type" content="website" />
    </Helmet>
  );
}

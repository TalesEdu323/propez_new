import { TAGGO_COMPANY } from './company';

type OrganizationJsonLdProps = {
  /** URL da página atual (ex.: origin + path) para @id opcional */
  pageUrl?: string;
};

export function buildOrganizationJsonLd(pageUrl?: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: TAGGO_COMPANY.brandName,
    legalName: TAGGO_COMPANY.legalName,
    url: TAGGO_COMPANY.siteUrl,
    email: TAGGO_COMPANY.email,
    telephone: TAGGO_COMPANY.phoneTel,
    address: {
      '@type': 'PostalAddress',
      streetAddress: TAGGO_COMPANY.address.street,
      addressLocality: TAGGO_COMPANY.address.city,
      addressRegion: TAGGO_COMPANY.address.state,
      addressCountry: 'BR',
    },
    ...(pageUrl ? { '@id': pageUrl } : {}),
    sameAs: [TAGGO_COMPANY.siteUrl, TAGGO_COMPANY.prosyncUrl],
  };
}

export function buildWebSiteJsonLd(origin: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Propez',
    url: origin || undefined,
    publisher: {
      '@type': 'Organization',
      name: TAGGO_COMPANY.brandName,
      url: TAGGO_COMPANY.siteUrl,
    },
  };
}

export function organizationJsonLdForPage(path: string): Record<string, unknown>[] {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pageUrl = origin && path ? `${origin}${path}` : undefined;
  return [
    buildOrganizationJsonLd(pageUrl),
    ...(origin ? [buildWebSiteJsonLd(origin)] : []),
  ];
}

/** @deprecated Use organizationJsonLdForPage via PageMeta jsonLd prop */
export function OrganizationJsonLd({ pageUrl }: OrganizationJsonLdProps) {
  void pageUrl;
  return null;
}

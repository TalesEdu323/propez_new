export type ArticleJsonLdInput = {
  title: string;
  description?: string;
  url: string;
  image?: string;
  datePublished?: string;
  authorName?: string;
};

export function buildArticleJsonLd(input: ArticleJsonLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    url: input.url,
    ...(input.image ? { image: input.image } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.authorName
      ? { author: { '@type': 'Person', name: input.authorName } }
      : {}),
    publisher: {
      '@type': 'Organization',
      name: 'Taggo',
      url: 'https://taggo.com.br',
    },
  };
}

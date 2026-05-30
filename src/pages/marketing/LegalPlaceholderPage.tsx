import { MarketingLayout } from '../../marketing/MarketingLayout';
import { PageMeta } from '../../marketing/PageMeta';

export default function LegalPlaceholderPage({ title, path }: { title: string; path: string }) {
  return (
    <MarketingLayout>
      <PageMeta title={title} path={path} />
      <div className="container mx-auto px-4 py-20 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">{title}</h1>
        <p className="text-zinc-500 leading-relaxed">
          Documento em elaboração. Para dúvidas, entre em contato pelo suporte da Taggo Software.
        </p>
      </div>
    </MarketingLayout>
  );
}

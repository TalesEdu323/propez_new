import { MarketingLayout } from '../../marketing/MarketingLayout';
import { PageMeta } from '../../marketing/PageMeta';
import { TAGGO_COMPANY } from '../../marketing/company';

export default function LegalPlaceholderPage({ title, path }: { title: string; path: string }) {
  return (
    <MarketingLayout>
      <PageMeta
        title={title}
        description={`${title} do Propez. Documento em elaboração — contato ${TAGGO_COMPANY.email}.`}
        path={path}
        noindex
      />
      <div className="container mx-auto px-4 py-20 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">{title}</h1>
        <p className="text-zinc-500 leading-relaxed">
          Documento em elaboração. Para dúvidas, entre em contato em{' '}
          <a href={`mailto:${TAGGO_COMPANY.email}`} className="text-zinc-900 font-medium hover:underline">
            {TAGGO_COMPANY.email}
          </a>{' '}
          ({TAGGO_COMPANY.legalName}).
        </p>
      </div>
    </MarketingLayout>
  );
}

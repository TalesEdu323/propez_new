import { Link } from 'react-router-dom';
import { TAGGO_COMPANY } from '../company';

export function LandingTaggoTrust() {
  return (
    <section className="py-10 border-t border-gray-100 bg-white" aria-label="Propez e Taggo">
      <div className="container mx-auto max-w-4xl px-6 text-center">
        <p className="text-sm text-gray-600 leading-relaxed">
          <strong className="text-gray-900">Propez</strong> é um produto{' '}
          <a
            href={TAGGO_COMPANY.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 font-semibold hover:underline"
          >
            {TAGGO_COMPANY.brandName}
          </a>
          {' '}— parte da{' '}
          <span className="font-semibold text-gray-900">{TAGGO_COMPANY.suiteName}</span>
          {' '}(ProSync, Cronnos, Themis e mais).
        </p>
        <p className="mt-3 text-xs text-gray-500">
          <Link to="/sobre-nos" className="hover:text-brand-600 transition-colors font-medium">
            Conheça a {TAGGO_COMPANY.legalName}
          </Link>
          {' · '}
          <a
            href={TAGGO_COMPANY.prosyncUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-600 transition-colors font-medium"
          >
            ProSync CRM
          </a>
        </p>
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, DollarSign, Users, BookOpen } from 'lucide-react';
import { PropezLogo } from '../components/PropezLogo';
import { TAGGO_COMPANY, TAGGO_LAB_PRODUCTS, TAGGO_SUITE_PRODUCTS } from './company';

type TaggoMarketingFooterProps = {
  className?: string;
};

export function TaggoMarketingFooter({ className = '' }: TaggoMarketingFooterProps) {
  const year = new Date().getFullYear();
  const { brandName, email, phone, address, labName, suiteName } = TAGGO_COMPANY;

  return (
    <footer className={`border-t border-gray-200 bg-white py-6 sm:py-8 md:py-10 ${className}`}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8 md:mb-10">
          <div className="p-3 sm:p-4 md:p-5 lg:col-span-2">
            <Link to="/" className="inline-block hover:opacity-80 transition-opacity mb-2 sm:mb-3">
              <PropezLogo height="md" />
            </Link>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed max-w-md">
              Propostas comerciais profissionais — builder visual, link público, assinatura digital e pagamentos em um
              só lugar. Produto {brandName}.
            </p>
          </div>

          <div className="p-3 sm:p-4 md:p-5">
            <h4 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base text-gray-900">{labName}</h4>
            <ul className="space-y-2 sm:space-y-2.5">
              {TAGGO_LAB_PRODUCTS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-600 transition-colors font-medium text-xs sm:text-sm block text-gray-900"
                  >
                    {item.name}
                  </a>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 leading-relaxed">{item.subtitle}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 sm:p-4 md:p-5">
            <h4 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base text-gray-900">{suiteName}</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              {TAGGO_SUITE_PRODUCTS.map((item) => (
                <li key={item.name}>
                  {item.internal ? (
                    <Link to={item.href} className="hover:text-brand-600 transition-colors text-gray-900 font-medium">
                      {item.name}
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-brand-600 transition-colors text-gray-900"
                    >
                      {item.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 sm:p-4 md:p-5">
            <h4 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base text-gray-900">Contato</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-500">
              <li className="flex items-center gap-1.5 sm:gap-2">
                <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <a href={`mailto:${email}`} className="hover:text-brand-600 transition-colors">
                  {email}
                </a>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2">
                <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <a href={`tel:${TAGGO_COMPANY.phoneTel}`} className="hover:text-brand-600 transition-colors">
                  {phone}
                </a>
              </li>
              <li className="flex items-start gap-1.5 sm:gap-2">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 mt-0.5" />
                <span>
                  {address.street}
                  <br />
                  {address.neighborhood}, {address.city}/{address.state}
                </span>
              </li>
              <li className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-1.5 sm:gap-2">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <Link to="/sobre-nos" className="hover:text-brand-600 transition-colors text-gray-900">
                  Sobre Nós
                </Link>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2">
                <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <Link to="/blog" className="hover:text-brand-600 transition-colors text-gray-900">
                  Artigos
                </Link>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2">
                <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <Link to="/#precos" className="hover:text-brand-600 transition-colors text-gray-900">
                  Planos
                </Link>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2 pl-5 sm:pl-6">
                <Link to="/termos" className="hover:text-brand-600 transition-colors text-gray-900">
                  Termos
                </Link>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2 pl-5 sm:pl-6">
                <Link to="/privacidade" className="hover:text-brand-600 transition-colors text-gray-900">
                  Privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 sm:pt-5 md:pt-6 text-center text-xs sm:text-sm text-gray-500 px-4">
          <p>
            &copy; {year} {brandName}. Todos os direitos reservados.
          </p>
          <p className="mt-1.5 sm:mt-2">
            Estrutura mantida continuamente pela {brandName} para garantir seu sucesso.
          </p>
        </div>
      </div>
    </footer>
  );
}

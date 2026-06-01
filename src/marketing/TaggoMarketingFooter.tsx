import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, DollarSign, Users, BookOpen } from 'lucide-react';
import { PropezLogo } from '../components/PropezLogo';

const PROSYNC_URL = import.meta.env.VITE_PROSYNC_URL || 'https://prosync.tech';

type TaggoMarketingFooterProps = {
  className?: string;
};

export function TaggoMarketingFooter({ className = '' }: TaggoMarketingFooterProps) {
  const year = new Date().getFullYear();

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
              só lugar.
            </p>
          </div>

          <div className="p-3 sm:p-4 md:p-5">
            <h4 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base text-gray-900">Taggo Lab</h4>
            <ul className="space-y-2 sm:space-y-2.5">
              <li>
                <a
                  href="https://social.taggo.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-600 transition-colors font-medium text-xs sm:text-sm block text-gray-900"
                >
                  Para Infoprodutores
                </a>
                <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Sistema completo de automação
                </div>
              </li>
              <li>
                <a
                  href="https://lp.taggo.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-600 transition-colors font-medium text-xs sm:text-sm block text-gray-900"
                >
                  Taggo Software House
                </a>
                <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Transforme suas ideias em realidade
                </div>
              </li>
              <li>
                <a
                  href="https://adv.taggo.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-600 transition-colors font-medium text-xs sm:text-sm block text-gray-900"
                >
                  Para Advogados
                </a>
                <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Sites profissionais para escritórios
                </div>
              </li>
            </ul>
          </div>

          <div className="p-3 sm:p-4 md:p-5">
            <h4 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base text-gray-900">Taggo Growth Suite</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <Link to="/" className="hover:text-brand-600 transition-colors text-gray-900 font-medium">
                  Propez — Propostas comerciais
                </Link>
              </li>
              <li>
                <a
                  href={PROSYNC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-600 transition-colors text-gray-900"
                >
                  ProSync — Gestão 360°
                </a>
              </li>
              <li>
                <a
                  href="https://cronnus.taggo.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-600 transition-colors text-gray-900"
                >
                  Cronnos AI
                </a>
              </li>
              <li>
                <a
                  href="https://themis.taggo.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-600 transition-colors text-gray-900"
                >
                  Themis
                </a>
              </li>
            </ul>
          </div>

          <div className="p-3 sm:p-4 md:p-5">
            <h4 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base text-gray-900">Contato</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-500">
              <li className="flex items-center gap-1.5 sm:gap-2">
                <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <a href="mailto:contato@taggo.com.br" className="hover:text-brand-600 transition-colors">
                  contato@taggo.com.br
                </a>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2">
                <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>(11) 91424-4166</span>
              </li>
              <li className="flex items-start gap-1.5 sm:gap-2">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 mt-0.5" />
                <span>
                  R. Topázio, 534 - Sala 07
                  <br />
                  Jardim Nomura, Cotia/SP
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
          <p>&copy; {year} Taggo. Todos os direitos reservados.</p>
          <p className="mt-1.5 sm:mt-2">
            Estrutura mantida continuamente pela Taggo para garantir seu sucesso.
          </p>
        </div>
      </div>
    </footer>
  );
}

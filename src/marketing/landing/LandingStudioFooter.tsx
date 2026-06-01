import { Link } from 'react-router-dom';
import { PropezLogo } from '../../components/PropezLogo';

export function LandingStudioFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <PropezLogo height="sm" />
        </Link>

        <p className="text-gray-400 text-sm font-medium text-center md:text-left">
          Um produto da Taggo Software. Feito no Brasil. © {year}
        </p>

        <div className="flex gap-6">
          <Link to="/termos" className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors">
            Termos
          </Link>
          <Link to="/privacidade" className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors">
            Privacidade
          </Link>
          <Link to="/sobre-nos" className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors">
            Contato
          </Link>
        </div>
      </div>
    </footer>
  );
}

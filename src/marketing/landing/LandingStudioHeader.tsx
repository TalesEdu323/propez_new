import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { PropezLogo } from '../../components/PropezLogo';

type AnchorNav = { label: string; href: string; isRoute?: false };
type RouteNav = { label: string; href: string; isRoute: true };
type NavItem = AnchorNav | RouteNav;

const NAV_LINKS: NavItem[] = [
  { label: 'Solução', href: '#solucao' },
  { label: 'Recursos', href: '#recursos' },
  { label: 'Preços', href: '#precos' },
  { label: 'Blog', href: '/blog', isRoute: true },
  { label: 'Quem somos', href: '/sobre-nos', isRoute: true },
];

function NavItemLink({
  item,
  className,
  onClick,
}: {
  item: NavItem;
  className: string;
  onClick?: () => void;
}) {
  if (item.isRoute) {
    return (
      <Link to={item.href} className={className} onClick={onClick}>
        {item.label}
      </Link>
    );
  }
  return (
    <a href={item.href} className={className} onClick={onClick}>
      {item.label}
    </a>
  );
}

export function LandingStudioHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2">
        <Link to="/" className="shrink-0 hover:opacity-80 transition-opacity">
          <PropezLogo height="md" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
            />
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className="text-sm font-medium bg-black text-white px-5 py-2.5 rounded-full hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 duration-200 shadow-lg shadow-black/10"
          >
            Começar Grátis
          </Link>
        </div>

        <div className="flex md:hidden items-center gap-2 shrink-0">
          <Link
            to="/cadastro"
            className="text-xs font-semibold bg-black text-white px-3 py-2 rounded-full whitespace-nowrap"
          >
            Começar
          </Link>
          <button
          type="button"
          className="md:hidden p-2 text-gray-600"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 right-0 bg-white border-b border-gray-100 p-6 flex flex-col gap-4 shadow-xl">
          {NAV_LINKS.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              className="text-base font-medium text-gray-600 py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          ))}
          <hr className="border-gray-100 my-2" />
          <Link to="/login" className="text-base font-medium text-gray-600 py-2" onClick={() => setIsMobileMenuOpen(false)}>
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className="text-base font-medium bg-brand-500 text-white px-5 py-3 rounded-full text-center"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Começar Grátis
          </Link>
        </div>
      )}
    </header>
  );
}

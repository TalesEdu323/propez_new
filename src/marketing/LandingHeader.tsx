import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, BookOpen, ArrowRight } from 'lucide-react';
import { PropezLogo } from '../components/PropezLogo';

const NAV_LINKS = [
  { label: 'Planos', href: '/#pricing' },
  { label: 'Blog', href: '/blog', icon: BookOpen },
  { label: 'Quem somos', href: '/sobre-nos' },
] as const;

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl border-black/5 shadow-sm'
          : 'bg-white/70 backdrop-blur-md border-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-4">
          <Link to="/" className="shrink-0 hover:opacity-80 transition-opacity">
            <PropezLogo height="md" />
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-zinc-600">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="hover:text-zinc-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 px-4 py-2"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-zinc-900 text-white px-5 py-2.5 rounded-full hover:bg-zinc-800 transition-colors"
            >
              Começar grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <button
            type="button"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-black/5 bg-white px-4 py-4 space-y-1">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {'icon' in item && item.icon ? <item.icon className="w-4 h-4" /> : null}
              {item.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <Link to="/login" className="btn-secondary w-full text-center py-3">
              Entrar
            </Link>
            <Link to="/cadastro" className="btn-primary w-full justify-center py-3">
              Começar grátis
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

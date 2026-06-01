import { Link } from 'react-router-dom';
import { PropezLogo } from '../components/PropezLogo';

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/5 bg-zinc-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2 space-y-4">
            <PropezLogo height="md" />
            <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
              Propez transforma propostas comerciais em experiências memoráveis — com builder visual,
              assinatura digital e pagamentos integrados.
            </p>
            <p className="text-xs text-zinc-400">
              Produto da <strong className="text-zinc-600">Taggo Software</strong>
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Produto</h3>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li><Link to="/#precos" className="hover:text-zinc-900">Planos</Link></li>
              <li><Link to="/planos" className="hover:text-zinc-900">Preços</Link></li>
              <li><Link to="/blog" className="hover:text-zinc-900">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Empresa</h3>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li><Link to="/sobre-nos" className="hover:text-zinc-900">Quem somos</Link></li>
              <li><Link to="/login" className="hover:text-zinc-900">Entrar</Link></li>
              <li><Link to="/cadastro" className="hover:text-zinc-900">Criar conta</Link></li>
              <li><Link to="/termos" className="hover:text-zinc-900">Termos</Link></li>
              <li><Link to="/privacidade" className="hover:text-zinc-900">Privacidade</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-black/5 text-center text-xs text-zinc-400">
          © {year} Taggo Software. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}

import { Navigate, useLocation } from 'react-router-dom';
import { useInitialLoaded, useSession } from '../lib/authSession';
import { isMarketingPath } from './constants';

/** Redireciona usuários autenticados em páginas de marketing (exceto `/`). */
export function LoggedInRedirect({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const initialLoaded = useInitialLoaded();
  const { pathname } = useLocation();

  if (!initialLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Carregando...
      </div>
    );
  }

  if (!session || !isMarketingPath(pathname)) {
    return <>{children}</>;
  }

  if (pathname === '/newsletter/unsubscribe') {
    return <>{children}</>;
  }

  if (pathname === '/login' || pathname === '/cadastro') {
    return <Navigate to="/" replace />;
  }

  if (pathname === '/planos') {
    return <Navigate to="/?route=planos" replace />;
  }

  return <Navigate to="/" replace />;
}

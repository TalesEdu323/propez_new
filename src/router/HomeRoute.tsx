import { Suspense } from 'react';
import { useInitialLoaded, useSession } from '../lib/authSession';
import { lazyWithRetry } from '../lib/lazyWithRetry';

const LandingPage = lazyWithRetry(() => import('../pages/marketing/LandingPage'));
const AuthenticatedApp = lazyWithRetry(() => import('../AuthenticatedApp'));

const loadingFallback = (
  <div className="min-h-screen flex items-center justify-center text-zinc-500 bg-white">
    Carregando...
  </div>
);

/** `/` — landing (visitante) ou painel (sessão ativa). */
export default function HomeRoute() {
  const session = useSession();
  const initialLoaded = useInitialLoaded();

  if (!initialLoaded) {
    return loadingFallback;
  }

  return (
    <Suspense fallback={loadingFallback}>
      {session ? <AuthenticatedApp /> : <LandingPage />}
    </Suspense>
  );
}

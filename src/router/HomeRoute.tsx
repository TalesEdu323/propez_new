import { Suspense, lazy } from 'react';
import { useInitialLoaded, useSession } from '../lib/authSession';

const LandingPage = lazy(() => import('../pages/marketing/LandingPage'));
const AuthenticatedApp = lazy(() => import('../AuthenticatedApp'));

const loadingFallback = (
  <div className="min-h-screen flex items-center justify-center text-zinc-500 bg-white">
    Carregando...
  </div>
);

/** `/` — landing para visitantes; painel do app para usuários logados. */
export default function HomeRoute() {
  const session = useSession();
  const initialLoaded = useInitialLoaded();

  if (!initialLoaded) {
    return loadingFallback;
  }

  if (session) {
    return (
      <Suspense fallback={loadingFallback}>
        <AuthenticatedApp />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={loadingFallback}>
      <LandingPage />
    </Suspense>
  );
}

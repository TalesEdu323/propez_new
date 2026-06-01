import { Suspense, lazy } from 'react';

const LandingPage = lazy(() => import('../pages/marketing/LandingPage'));

const loadingFallback = (
  <div className="min-h-screen flex items-center justify-center text-zinc-500 bg-white">
    Carregando...
  </div>
);

/** `/` — landing pública (app autenticado em `/app`). */
export default function HomeRoute() {
  return (
    <Suspense fallback={loadingFallback}>
      <LandingPage />
    </Suspense>
  );
}

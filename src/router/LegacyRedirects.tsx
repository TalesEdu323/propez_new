import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/** Compatibilidade com links antigos (?route= na raiz, reset-password). */
export function LegacyRedirects() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const route = params.get('route');
    const token = params.get('token');

    if (route === 'reset-password' && token) {
      navigate(`/login?token=${encodeURIComponent(token)}`, { replace: true });
      return;
    }

    // Links antigos /app?route=... → manter query na raiz (HomeRoute + AuthenticatedApp)
    if (window.location.pathname === '/app' && route) {
      const q = params.toString();
      navigate(q ? `/?${q}` : '/', { replace: true });
    }
  }, [params, navigate]);

  return null;
}

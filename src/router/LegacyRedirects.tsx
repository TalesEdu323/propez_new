import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/** Compatibilidade com links antigos (?route= na raiz, reset-password). */
export function LegacyRedirects() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const route = params.get('route');
    const token = params.get('token');

    if (route === 'reset-password' && token) {
      navigate(`/login?token=${encodeURIComponent(token)}`, { replace: true });
      return;
    }

    // Links antigos /?route=... → /app?route=...
    if (pathname === '/' && route) {
      const q = params.toString();
      navigate(q ? `/app?${q}` : '/app', { replace: true });
    }
  }, [params, navigate, pathname]);

  return null;
}

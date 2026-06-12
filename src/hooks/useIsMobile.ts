import { useEffect, useState } from 'react';

/** Matches Tailwind `md` breakpoint (768px). */
export function useIsMobile(breakpointPx = 768) {
  const query = `(max-width: ${breakpointPx - 1}px)`;
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return isMobile;
}

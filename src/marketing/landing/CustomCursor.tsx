import { useEffect } from 'react';

export function CustomCursor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(hover: none)').matches) return;
    if (!document.body.classList.contains('landing-marketing')) return;

    const dot = document.querySelector('.cursor-dot') as HTMLElement;
    const ring = document.querySelector('.cursor-ring') as HTMLElement;

    if (!dot || !ring) return;

    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;
    let requestRef: number;
    let hasMouseMoved = false;

    const onMouseMove = (e: MouseEvent) => {
      if (!hasMouseMoved) {
        document.body.classList.add('cursor-active');
        hasMouseMoved = true;
      }
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate3d(${mx - 4}px, ${my - 4}px, 0)`;
    };

    const animateRing = () => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      const ringSize = parseInt(ring.style.width || '36', 10);
      const offset = ringSize / 2;
      ring.style.transform = `translate3d(${rx - offset}px, ${ry - offset}px, 0)`;
      requestRef = requestAnimationFrame(animateRing);
    };

    window.addEventListener('mousemove', onMouseMove);
    requestRef = requestAnimationFrame(animateRing);

    const handleHoverEnter = () => {
      ring.style.width = '56px';
      ring.style.height = '56px';
      ring.style.opacity = '1';
    };

    const handleHoverLeave = () => {
      ring.style.width = '36px';
      ring.style.height = '36px';
      ring.style.opacity = '0.5';
    };

    const applyHoverListeners = () => {
      const hoverElements = document.querySelectorAll('a, button, input, [role="button"]');
      hoverElements.forEach((el) => {
        el.addEventListener('mouseenter', handleHoverEnter);
        el.addEventListener('mouseleave', handleHoverLeave);
      });
    };

    applyHoverListeners();

    const observer = new MutationObserver(applyHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(requestRef);
      observer.disconnect();
      document.body.classList.remove('cursor-active');
      const hoverElements = document.querySelectorAll('a, button, input, [role="button"]');
      hoverElements.forEach((el) => {
        el.removeEventListener('mouseenter', handleHoverEnter);
        el.removeEventListener('mouseleave', handleHoverLeave);
      });
    };
  }, []);

  if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
    return null;
  }

  return (
    <>
      <div className="cursor-dot hidden md:block" />
      <div className="cursor-ring hidden md:block" />
    </>
  );
}

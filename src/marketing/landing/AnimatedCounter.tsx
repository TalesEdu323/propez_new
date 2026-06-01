import { useEffect, useState, useRef } from 'react';
import { useInView } from 'motion/react';

export function AnimatedCounter({
  target,
  isCurrency = false,
}: {
  target: number;
  isCurrency?: boolean;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;

    let startTimestamp: number;
    let requestRef: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / 1500, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(ease * target));

      if (progress < 1) {
        requestRef = window.requestAnimationFrame(step);
      }
    };
    requestRef = window.requestAnimationFrame(step);

    return () => cancelAnimationFrame(requestRef);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {isCurrency ? `R$ ${count.toLocaleString('pt-BR')}` : count}
    </span>
  );
}

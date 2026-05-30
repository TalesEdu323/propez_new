import { useState, type ReactNode } from 'react';

export function ImageWithFallback({
  src,
  alt,
  className,
  fallbackContent,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackContent: ReactNode;
}) {
  const [hasError, setHasError] = useState(false);
  if (hasError) return <>{fallbackContent}</>;
  return (
    <img src={src} alt={alt} className={className} onError={() => setHasError(true)} />
  );
}

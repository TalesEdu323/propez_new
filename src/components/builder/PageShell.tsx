import React from 'react';
import type { BuilderPageLayout } from '../../types/builder';
import { pageShellStyle } from './pageLayoutUtils';

export interface PageShellProps {
  layout?: BuilderPageLayout | null;
  className?: string;
  children: React.ReactNode;
}

function BackgroundEffectLayer({ effect }: { effect: 'dots' | 'grid' }) {
  const className =
    effect === 'grid' ? 'propez-bg-effect propez-bg-effect-grid' : 'propez-bg-effect propez-bg-effect-dots';
  return <div className={className} aria-hidden />;
}

/**
 * Wrapper único de largura/margem da página — editor, preview interno e link público.
 */
export function PageShell({ layout, className = '', children }: PageShellProps) {
  const effect = layout?.backgroundEffect;
  const showEffect = effect === 'dots' || effect === 'grid';

  return (
    <div className={`w-full relative ${className}`} style={pageShellStyle(layout)}>
      {showEffect ? <BackgroundEffectLayer effect={effect} /> : null}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

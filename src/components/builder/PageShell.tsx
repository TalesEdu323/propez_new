import React from 'react';
import type { BuilderPageLayout } from '../../types/builder';
import { pageShellStyle } from './pageLayoutUtils';

export interface PageShellProps {
  layout?: BuilderPageLayout | null;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wrapper único de largura/margem da página — editor, preview interno e link público.
 */
export function PageShell({ layout, className = '', children }: PageShellProps) {
  return (
    <div className={`w-full ${className}`} style={pageShellStyle(layout)}>
      {children}
    </div>
  );
}

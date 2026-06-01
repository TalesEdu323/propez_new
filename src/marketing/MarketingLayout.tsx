import type { ReactNode } from 'react';
import { LandingHeader } from './LandingHeader';
import { MarketingFooter } from './MarketingFooter';
import { FloatingContact } from './FloatingContact';
import { LandingStudioHeader } from './landing/LandingStudioHeader';
import { LandingStudioFooter } from './landing/LandingStudioFooter';

type MarketingLayoutProps = {
  children: ReactNode;
  variant?: 'default' | 'studio';
};

export function MarketingLayout({ children, variant = 'default' }: MarketingLayoutProps) {
  if (variant === 'studio') {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
        <LandingStudioHeader />
        <main className="flex-1">{children}</main>
        <LandingStudioFooter />
        <FloatingContact />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
      <LandingHeader />
      <main className="flex-1 pt-16">{children}</main>
      <MarketingFooter />
      <FloatingContact />
    </div>
  );
}

import type { ReactNode } from 'react';
import { LandingHeader } from './LandingHeader';
import { MarketingFooter } from './MarketingFooter';
import { FloatingContact } from './FloatingContact';

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
      <LandingHeader />
      <main className="flex-1 pt-16">{children}</main>
      <MarketingFooter />
      <FloatingContact />
    </div>
  );
}

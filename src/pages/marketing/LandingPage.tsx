import { useLayoutEffect } from 'react';
import { MarketingLayout } from '../../marketing/MarketingLayout';
import { PageMeta } from '../../marketing/PageMeta';
import { CustomCursor } from '../../marketing/landing/CustomCursor';
import { LandingHero } from '../../marketing/landing/LandingHero';
import { LandingComparison } from '../../marketing/landing/LandingComparison';
import { LandingFeatures } from '../../marketing/landing/LandingFeatures';
import { LandingAudience } from '../../marketing/landing/LandingAudience';
import { LandingROICalculator } from '../../marketing/landing/LandingROICalculator';
import { LandingPricing } from '../../marketing/landing/LandingPricing';
import { LandingFinalCTA } from '../../marketing/landing/LandingFinalCTA';
import { organizationJsonLdForPage } from '../../marketing/OrganizationJsonLd';
import { LANDING_SEO } from '../../marketing/siteCopy';

export default function LandingPage() {
  useLayoutEffect(() => {
    document.body.classList.add('landing-marketing');
    return () => {
      document.body.classList.remove('landing-marketing', 'cursor-active');
    };
  }, []);

  return (
    <MarketingLayout variant="studio">
      <PageMeta
        title={LANDING_SEO.title}
        description={LANDING_SEO.description}
        path="/"
        jsonLd={organizationJsonLdForPage('/')}
      />
      <CustomCursor enabled />
      <LandingHero />
      <LandingComparison />
      <LandingFeatures />
      <LandingAudience />
      <LandingROICalculator />
      <LandingPricing />
      <LandingFinalCTA />
    </MarketingLayout>
  );
}

import { AnimatedSection } from './AnimatedSection';
import { PricingSection } from '../PricingSection';
import { LANDING_PRICING } from '../siteCopy';

export function LandingPricing() {
  return (
    <section className="py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-sm font-bold mb-6">
            {LANDING_PRICING.badge}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-heading text-balance">{LANDING_PRICING.h2}</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium text-balance">
            {LANDING_PRICING.subtitle}
          </p>
        </AnimatedSection>

        <PricingSection variant="studio" id="precos" showTitle={false} />

        <AnimatedSection delay={0.4} className="text-center mt-24">
          <p className="text-xl md:text-2xl font-medium text-gray-600 border border-gray-200 bg-white shadow-xl shadow-gray-200/50 rounded-2xl p-8 max-w-4xl mx-auto hover-lift text-balance">
            {LANDING_PRICING.footnote}
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}

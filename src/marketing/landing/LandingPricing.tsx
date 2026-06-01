import { AnimatedSection } from './AnimatedSection';
import { PricingSection } from '../PricingSection';

export function LandingPricing() {
  return (
    <section className="py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-sm font-bold mb-6">
            Uma proposta a mais já paga a conta
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-heading">Planos e Preços</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
            Sem multa, sem surpresas. Comece grátis e evolua o pipeline quando fizer sentido para o seu volume.
          </p>
        </AnimatedSection>

        <PricingSection variant="studio" id="precos" showTitle={false} />

        <AnimatedSection delay={0.4} className="text-center mt-24">
          <p className="text-xl md:text-2xl font-medium text-gray-600 border border-gray-200 bg-white shadow-xl shadow-gray-200/50 rounded-2xl p-8 max-w-4xl mx-auto hover-lift">
            Uma conta de gestão de tráfego de <strong className="text-gray-900">R$ 3.000</strong> fechada a mais por
            mês já paga o Propez por{' '}
            <strong className="text-brand-600 border-b-2 border-brand-500">2 anos inteiros</strong>.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}

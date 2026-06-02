import { Check, X } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';
import { LANDING_COMPARISON } from '../siteCopy';

const comparisons = [
  { old: 'Documento montado no Word ou em PDF estático', new: 'Builder visual com modelos reutilizáveis' },
  { old: 'Envio por e-mail ou WhatsApp, sem rastreio', new: 'Link público com abertura e tempo de leitura' },
  { old: 'Assinatura em contrato separado', new: 'Assinatura digital integrada à proposta' },
  { old: 'Cobrança em link ou Pix avulso', new: 'Pagamento via Stripe na mesma página' },
  { old: 'Planilha para follow-up manual', new: 'Pipeline com acompanhamento de leitura' },
];

export function LandingComparison() {
  return (
    <section id="solucao" className="bg-gray-50 pt-32 pb-24 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-heading text-balance">
            {LANDING_COMPARISON.h2}
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium text-balance">
            {LANDING_COMPARISON.subtitle}
          </p>
        </AnimatedSection>

        <div className="max-w-5xl mx-auto mt-12">
          <div className="grid md:grid-cols-2 rounded-3xl border border-gray-200 overflow-hidden shadow-xl shadow-gray-200/50 hover-lift">
            <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-gray-100 bg-white relative">
              <h3 className="text-xl font-bold text-gray-400 mb-8 pb-4 border-b border-gray-100">
                {LANDING_COMPARISON.colOld}
              </h3>
              <div className="space-y-6">
                {comparisons.map((item, i) => (
                  <AnimatedSection key={i} delay={0.1 * i} className="flex items-center gap-4 text-gray-500">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <X className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="font-medium text-lg leading-tight">{item.old}</span>
                  </AnimatedSection>
                ))}
              </div>
            </div>

            <div className="p-8 md:p-12 bg-gray-900 relative">
              <h3 className="text-xl font-bold text-white mb-8 pb-4 border-b border-gray-800 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                {LANDING_COMPARISON.colNew}
              </h3>
              <div className="space-y-6">
                {comparisons.map((item, i) => (
                  <AnimatedSection
                    key={i}
                    delay={0.1 * i}
                    className="flex items-center gap-4 text-white p-3 -mx-3 rounded-xl bg-brand-500/10 border border-brand-500/20 shadow-sm transition-colors hover:bg-brand-500/20"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg leading-tight">{item.new}</span>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

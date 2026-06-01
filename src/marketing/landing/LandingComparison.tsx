import { Check, X } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';

const comparisons = [
  { old: 'PDF montado no Word às pressas', new: 'Builder visual com templates de alta conversão' },
  { old: '"Você viu minha proposta?" no WhatsApp', new: 'Link público abrindo direto, sem baixar' },
  { old: 'Pedir rubrica em contrato separado', new: 'Assinatura digital com validade legal integrada' },
  { old: 'Cobrança vai solta num link Pix', new: 'Pagamento via Stripe na própria página' },
  { old: 'Planilha manual para follow-up', new: 'Pipeline visual com tracking de leitura real' },
];

export function LandingComparison() {
  return (
    <section id="solucao" className="bg-gray-50 pt-32 pb-24 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-heading">
            Do lead quente para o contrato assinado —{' '}
            <br className="hidden md:block" />
            sem sair da plataforma.
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
            Sua agência merece um processo de fechamento que seja tão impressionante quanto a sua entrega final.
          </p>
        </AnimatedSection>

        <div className="max-w-5xl mx-auto mt-12">
          <div className="grid md:grid-cols-2 rounded-3xl border border-gray-200 overflow-hidden shadow-xl shadow-gray-200/50 hover-lift">
            <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-gray-100 bg-white relative">
              <h3 className="text-xl font-bold text-gray-400 mb-8 pb-4 border-b border-gray-100">Como é hoje</h3>
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
                Seu pipeline com o Propez
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

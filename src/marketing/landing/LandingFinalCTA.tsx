import { ArrowRight } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';
import { MagneticLink } from './MagneticButton';

export function LandingFinalCTA() {
  return (
    <section className="py-24 bg-white border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <AnimatedSection>
          <h2 className="text-3xl md:text-5xl font-bold mb-8 font-heading">Sinceramente...</h2>
          <p className="text-xl md:text-2xl text-gray-500 font-medium leading-relaxed mb-12">
            Quantos negócios você perdeu neste ano porque a proposta demorou demais, parecia amadora ou o cliente
            simplesmente sumiu (e você nem soube)?
          </p>

          <MagneticLink
            to="/cadastro"
            className="h-16 px-10 bg-black text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-brand-600 transition-colors shadow-2xl shadow-brand-500/20 mx-auto group hover-lift w-full sm:w-auto max-w-md"
          >
            Começar a Fechar Mais Negócios
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </MagneticLink>
        </AnimatedSection>
      </div>
    </section>
  );
}

import { Clock, CheckSquare, Eye, LayoutTemplate, Sparkles } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';
import { LANDING_FEATURES } from '../siteCopy';

const features = [
  {
    icon: <Clock className="w-6 h-6 text-brand-600" />,
    title: 'Envio no mesmo dia',
    desc: 'Modelos prontos e builder visual para enviar a proposta logo após a reunião com o cliente.',
  },
  {
    icon: <CheckSquare className="w-6 h-6 text-brand-600" />,
    title: 'Apresentação profissional',
    desc: 'Propostas alinhadas à sua marca, com layout consistente em cada envio.',
  },
  {
    icon: <Eye className="w-6 h-6 text-brand-600" />,
    title: 'Acompanhamento de leitura',
    desc: 'Saiba quando o cliente abriu, quanto tempo permaneceu na proposta e em quais seções parou.',
  },
  {
    icon: <LayoutTemplate className="w-6 h-6 text-brand-600" />,
    title: 'Padronização da equipe',
    desc: 'Biblioteca compartilhada de modelos para vendas e atendimento sem perder identidade visual.',
  },
  {
    icon: <Sparkles className="w-6 h-6 text-brand-600" />,
    title: 'Criação assistida por IA',
    desc: 'A IA estrutura o rascunho; você revisa escopo, valores e detalhes antes do envio.',
  },
];

export function LandingFeatures() {
  return (
    <section id="recursos" className="py-32 bg-white relative">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="mb-20 max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight font-heading text-balance">
            {LANDING_FEATURES.h2}
          </h2>
          <p className="text-xl text-gray-500 font-medium leading-relaxed text-balance">
            {LANDING_FEATURES.subtitle}
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => (
            <AnimatedSection
              key={feat.title}
              delay={0.1 * idx}
              className="bg-gray-50/50 border border-gray-100 p-8 rounded-3xl hover-lift relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-6 text-6xl font-black text-gray-100 group-hover:text-brand-50 transition-colors z-0 pointer-events-none select-none font-heading">
                0{idx + 1}
              </div>

              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mb-8 relative z-10 group-hover:bg-brand-50 group-hover:border-brand-200 transition-colors">
                {feat.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4 relative z-10 text-gray-900 group-hover:text-brand-600 transition-colors font-heading">
                {feat.title}
              </h3>
              <p className="text-gray-500 leading-relaxed font-medium relative z-10 text-lg">{feat.desc}</p>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

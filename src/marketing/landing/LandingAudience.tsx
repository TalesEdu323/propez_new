import { User, Users, Briefcase, ArrowUpRight } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';
import { LANDING_AUDIENCE } from '../siteCopy';

const targets = [
  {
    icon: <User className="w-6 h-6 text-blue-400" />,
    title: 'Autônomos e Freelancers',
    bgClass: 'bg-gradient-to-b from-blue-950/40 to-transparent border-blue-900/50',
    tags: ['Modelos reutilizáveis', 'Link público profissional', 'Pagamento integrado'],
  },
  {
    icon: <Users className="w-6 h-6 text-brand-500" />,
    title: 'Agências e Estúdios',
    bgClass: 'bg-gradient-to-b from-brand-950/40 to-transparent border-brand-900/50',
    tags: ['Marca consistente', 'Biblioteca compartilhada', 'Envio padronizado'],
  },
  {
    icon: <Briefcase className="w-6 h-6 text-emerald-400" />,
    title: 'Consultores B2B',
    bgClass: 'bg-gradient-to-b from-emerald-950/40 to-transparent border-emerald-900/50',
    tags: ['Escopo estruturado', 'Assinatura digital', 'Analytics de leitura'],
  },
];

export function LandingAudience() {
  return (
    <section className="py-32 bg-black border-y border-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight font-heading text-balance">
            {LANDING_AUDIENCE.h2}
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-medium text-balance">
            {LANDING_AUDIENCE.subtitle}
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8">
          {targets.map((item, i) => (
            <AnimatedSection
              key={item.title}
              delay={0.1 * i}
              className={`rounded-3xl p-8 border ${item.bgClass} hover-lift bg-gray-950`}
            >
              <div className="w-14 h-14 rounded-2xl bg-black border border-gray-800 flex items-center justify-center mb-8 shadow-inner">
                {item.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-8 font-heading">{item.title}</h3>
              <div className="space-y-4">
                {item.tags.map((tag) => (
                  <div key={tag} className="flex items-center gap-4 text-gray-300 font-medium">
                    <ArrowUpRight className="w-4 h-4 text-gray-600 shrink-0" />
                    {tag}
                  </div>
                ))}
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

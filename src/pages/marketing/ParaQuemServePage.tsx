import { Link } from 'react-router-dom';
import { Users, Building2, LineChart, ArrowRight } from 'lucide-react';
import { MarketingLayout } from '../../marketing/MarketingLayout';
import { PageMeta } from '../../marketing/PageMeta';

const SEGMENTS = [
  {
    icon: Users,
    title: 'Autônomos e freelancers',
    pain: 'Perder tempo montando PDFs que não convertem.',
    solution: 'Modelos prontos, link público e pagamento na hora.',
  },
  {
    icon: Building2,
    title: 'Agências e estúdios',
    pain: 'Cada vendedor com um formato diferente de proposta.',
    solution: 'Biblioteca de modelos, builder visual e marca consistente.',
  },
  {
    icon: LineChart,
    title: 'Consultores B2B',
    pain: 'Proposta longa sem CTA claro nem follow-up.',
    solution: 'Escopo estruturado, assinatura digital e analytics de visualização.',
  },
];

export default function ParaQuemServePage() {
  return (
    <MarketingLayout>
      <PageMeta
        title="Para quem serve"
        description="Propez para autônomos, agências e consultores que vendem serviços."
        path="/para-quem-serve"
      />
      <section className="py-16 lg:py-20 text-center">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">Para quem serve</h1>
          <p className="text-lg text-zinc-500">
            Se você vende serviços e precisa de propostas que impressionam e convertem, o Propez é para você.
          </p>
        </div>
      </section>

      <section className="pb-20">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl space-y-8">
          {SEGMENTS.map((s) => (
            <div key={s.title} className="flex flex-col md:flex-row gap-6 p-8 rounded-2xl bg-zinc-50 border border-black/5">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shrink-0">
                <s.icon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">{s.title}</h2>
                <p className="text-sm text-red-600/80 font-medium mb-1">Desafio: {s.pain}</p>
                <p className="text-zinc-600 text-sm mb-4">Com o Propez: {s.solution}</p>
                <Link to="/cadastro" className="inline-flex items-center gap-1 text-sm font-bold text-zinc-900">
                  Criar conta grátis <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}

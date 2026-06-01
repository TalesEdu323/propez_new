import { HelpCircle } from 'lucide-react';
import { MarketingLayout } from '../../marketing/MarketingLayout';
import { PageMeta } from '../../marketing/PageMeta';
import { PricingSection } from '../../marketing/PricingSection';

const FAQ = [
  { q: 'Posso começar de graça?', a: 'Sim. O plano Free inclui 3 propostas por mês para você testar o fluxo completo.' },
  { q: 'Como funciona o pagamento dos planos pagos?', a: 'Checkout seguro via Stripe. Cancele quando quiser, sem multa.' },
  { q: 'Preciso de cartão no cadastro?', a: 'Não para o plano Free. Planos pagos são ativados após o checkout.' },
  { q: 'Integra com outras ferramentas?', a: 'Pro, Business e integrações Suite Taggo (ProSync, Rubrica).' },
];

export default function PublicPlanosPage() {
  return (
    <MarketingLayout>
      <PageMeta title="Planos e preços — Propez" description="Planos Free, Pro e Business do Propez." path="/planos" />

      <section className="pt-8 pb-4 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Escolha o plano ideal para o seu negócio</h1>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
            Evolua conforme seu volume de propostas. Comece grátis e faça upgrade quando precisar.
          </p>
        </div>
      </section>

      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <PricingSection variant="studio" id="precos" showTitle={false} />
        </div>
      </section>

      <section className="py-16 bg-zinc-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8 flex items-center justify-center gap-2">
            <HelpCircle className="w-6 h-6" /> Perguntas frequentes
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-white rounded-xl p-5 border border-black/5">
                <h3 className="font-semibold text-sm mb-2">{item.q}</h3>
                <p className="text-sm text-zinc-500">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

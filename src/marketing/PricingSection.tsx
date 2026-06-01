import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2 } from 'lucide-react';
import { PLAN_META, type PlanTier } from '../lib/featureFlags';
import { WHATSAPP_URL } from './constants';
import { AnimatedSection } from './landing/AnimatedSection';
import { MagneticLink } from './landing/MagneticButton';

const PLAN_FEATURES: Record<PlanTier, string[]> = {
  free: [
    '3 propostas por mês',
    '5 clientes cadastrados',
    '1 modelo simples pronto',
    'Widgets básicos do builder',
    'Link público com marca Propez',
  ],
  pro: [
    'Propostas e clientes ilimitados',
    '4 modelos prontos (incluindo Marketing)',
    'Export PDF sem marca d\'água',
    'Integração ProSync CRM',
    'Assinatura Rubrica (20/mês)',
    'Stripe com link de pagamento',
    'IA generativa (50/mês)',
  ],
  business: [
    'Tudo do Pro, sem limites',
    'Até 5 usuários na conta',
    'Todos os widgets premium',
    'Rubrica e IA ilimitadas',
    'Analytics avançado + heatmap',
    'White-label parcial (subdomínio)',
    'Onboarding 1:1 com CS',
  ],
};

const STUDIO_TARGETS: Record<PlanTier, string> = {
  free: 'Testar processo',
  pro: 'Agências e Freelas',
  business: 'Times comerciais',
};

type StripePlan = { id: 'pro' | 'business'; prices: { monthly: string | null; yearly: string | null } };

type PricingSectionProps = {
  id?: string;
  showTitle?: boolean;
  compact?: boolean;
  variant?: 'default' | 'studio';
};

export function PricingSection({
  id = 'pricing',
  showTitle = true,
  compact = false,
  variant = 'default',
}: PricingSectionProps) {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [stripePlans, setStripePlans] = useState<StripePlan[]>([]);
  const isStudio = variant === 'studio';

  useEffect(() => {
    fetch('/api/stripe/plans')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.plans && setStripePlans(d.plans))
      .catch(() => {});
  }, []);

  const formatPrice = (tier: PlanTier) => {
    if (tier === 'free') return 'R$ 0';
    if (tier === 'business' && isStudio) return 'Personalizado';
    const sp = stripePlans.find((p) => p.id === tier);
    const raw = cycle === 'yearly' ? sp?.prices.yearly : sp?.prices.monthly;
    if (!raw) {
      const fallback = PLAN_META[tier].monthlyPrice;
      return fallback > 0 ? `R$ ${fallback}` : '—';
    }
    const n = Number(raw);
    return Number.isFinite(n) ? `R$ ${n.toFixed(2).replace('.', ',')}` : raw;
  };

  const tiers: PlanTier[] = ['free', 'pro', 'business'];

  const cycleToggle = (
    <div className="flex justify-center mb-10">
      <div
        className={`inline-flex rounded-full p-1 ${isStudio ? 'bg-gray-100' : 'bg-zinc-100'}`}
      >
        <button
          type="button"
          onClick={() => setCycle('monthly')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            cycle === 'monthly'
              ? 'bg-white shadow text-gray-900'
              : isStudio
                ? 'text-gray-500'
                : 'text-zinc-500'
          }`}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => setCycle('yearly')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            cycle === 'yearly'
              ? 'bg-white shadow text-gray-900'
              : isStudio
                ? 'text-gray-500'
                : 'text-zinc-500'
          }`}
        >
          Anual
          <span
            className={`ml-2 text-[10px] font-bold ${isStudio ? 'text-brand-600' : 'text-emerald-600'}`}
          >
            20% OFF
          </span>
        </button>
      </div>
    </div>
  );

  if (isStudio) {
    return (
      <div id={id} className={compact ? 'py-12' : ''}>
        {cycleToggle}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {tiers.map((tier, i) => {
            const popular = tier === 'pro';
            const meta = PLAN_META[tier];
            const features = PLAN_FEATURES[tier];
            const ctaClass = popular
              ? 'bg-brand-500 text-white hover:bg-brand-600'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200';

            const card = (
              <div
                className={`relative rounded-3xl p-8 hover-lift flex flex-col h-full ${
                  popular
                    ? 'bg-black text-white shadow-2xl shadow-gray-400 md:scale-[1.03] z-10 ring-2 ring-brand-500'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-white px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                    Mais Popular
                  </div>
                )}

                <div className="mb-8">
                  <h3 className={`text-2xl font-bold mb-2 font-heading ${popular ? 'text-white' : 'text-gray-900'}`}>
                    {meta.name}
                  </h3>
                  <p className={`text-sm font-medium ${popular ? 'text-gray-400' : 'text-gray-500'}`}>
                    {STUDIO_TARGETS[tier]}
                  </p>
                </div>

                <div className="mb-8 flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight">{formatPrice(tier)}</span>
                  {tier !== 'free' && tier !== 'business' && (
                    <span className={`text-sm font-bold ${popular ? 'text-gray-400' : 'text-gray-500'}`}>
                      {cycle === 'yearly' ? '/ano' : '/mês'}
                    </span>
                  )}
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 shrink-0 ${popular ? 'text-brand-500' : 'text-gray-400'}`} />
                      <span className={`font-medium ${popular ? 'text-gray-300' : 'text-gray-600'}`}>{feat}</span>
                    </li>
                  ))}
                </ul>

                {tier === 'business' ? (
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full py-4 rounded-xl font-bold text-center transition-all ${ctaClass}`}
                  >
                    Falar com Vendas
                  </a>
                ) : (
                  <MagneticLink
                    to={tier === 'free' ? '/cadastro' : `/cadastro?plan=${tier}`}
                    className={`block w-full py-4 rounded-xl font-bold text-center transition-all border-none ${ctaClass}`}
                  >
                    {tier === 'free' ? 'Começar Grátis' : 'Assinar Pro'}
                  </MagneticLink>
                )}
              </div>
            );

            return (
              <AnimatedSection key={tier} delay={0.1 * i}>
                {card}
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section id={id} className={compact ? 'py-12' : 'py-24 md:py-32'}>
      <div className="container mx-auto px-4 lg:px-8">
        {showTitle && (
          <div className="max-w-3xl mx-auto text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 text-xs font-bold uppercase tracking-widest text-zinc-600 mb-4">
              Planos
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Comece agora e evolua quando fizer sentido</h2>
            <p className="text-lg text-zinc-500">Teste grátis. Cancele quando quiser — sem multa.</p>
          </div>
        )}

        {cycleToggle}

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tiers.map((tier) => {
            const popular = tier === 'pro';
            const meta = PLAN_META[tier];
            return (
              <div
                key={tier}
                className={`relative rounded-2xl border p-8 flex flex-col bg-white transition-all hover:shadow-xl ${
                  popular ? 'border-zinc-900 shadow-2xl md:scale-[1.03]' : 'border-black/5'
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase bg-zinc-900 text-white px-4 py-1.5 rounded-full">
                    Mais popular
                  </span>
                )}
                <h3 className="text-2xl font-bold">{meta.name}</h3>
                <p className="text-sm text-zinc-500 mt-1">{meta.tagline}</p>
                <div className="mt-5">
                  <span className="text-4xl font-bold">{formatPrice(tier)}</span>
                  {tier !== 'free' && tier !== 'business' && (
                    <span className="text-zinc-400 ml-2 text-sm">{cycle === 'yearly' ? '/ano' : '/mês'}</span>
                  )}
                </div>
                <ul className="mt-8 space-y-3 flex-1">
                  {PLAN_FEATURES[tier].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-zinc-600">
                      <CheckCircle2
                        className={`w-5 h-5 shrink-0 mt-0.5 ${popular ? 'text-zinc-900' : 'text-emerald-600'}`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                {tier === 'business' ? (
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 py-3.5 rounded-xl text-center text-sm font-semibold bg-zinc-100 text-zinc-900 hover:bg-zinc-200 block"
                  >
                    Falar com vendas
                  </a>
                ) : (
                  <Link
                    to={tier === 'free' ? '/cadastro' : `/cadastro?plan=${tier}`}
                    className={`mt-8 py-3.5 rounded-xl text-center text-sm font-semibold transition-colors ${
                      popular ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                    }`}
                  >
                    {tier === 'free' ? 'Começar grátis' : 'Assinar agora'}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

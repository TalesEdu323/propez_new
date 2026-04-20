import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Sparkles, ChevronLeft, Loader2 } from 'lucide-react';
import { store, resolvePlan } from '../lib/store';
import { useUserConfig } from '../hooks/useStoreEntity';
import { PLAN_META, type PlanTier } from '../lib/featureFlags';
import type { NavigateFn } from '../types/navigation';

interface StripePlanApi {
  id: 'pro' | 'business';
  name: string;
  prices: { monthly: string | null; yearly: string | null };
}

interface StripePlansResponse {
  currency: string;
  plans: StripePlanApi[];
}

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
    'Todos os widgets intermediários',
    'Export PDF sem marca d\u2019água',
    'Integração ProSync CRM',
    'Assinatura Rubrica (20/mês)',
    'Stripe com link de pagamento',
    'IA generativa (50/mês)',
    'Analytics básico + follow-up',
  ],
  business: [
    'Tudo do Pro, sem limites',
    'Até 5 usuários na conta',
    'Todos os widgets premium',
    'Biblioteca jurídica (10+ contratos)',
    'Rubrica e IA ilimitadas',
    'Stripe com cobrança recorrente',
    'Analytics avançado + heatmap',
    'Automação multi-passo + WhatsApp',
    'White-label parcial (subdomínio)',
    'Onboarding 1:1 com CS',
  ],
};

interface PlanosProps {
  navigate: NavigateFn;
  targetPlan?: PlanTier;
}

export default function Planos({ navigate, targetPlan }: PlanosProps) {
  const userConfig = useUserConfig();
  const currentPlan = resolvePlan(userConfig);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [plans, setPlans] = useState<StripePlansResponse | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);
  const [returnInfo, setReturnInfo] = useState<{ type: 'success' | 'canceled'; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/stripe/plans')
      .then(res => res.json())
      .then(setPlans)
      .catch(err => console.error('Erro ao carregar planos:', err));
  }, []);

  // Ao voltar do Stripe: se há session_id, consulta o status e atualiza config.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const success = params.get('success');
    const canceled = params.get('canceled');

    if (canceled) {
      setReturnInfo({ type: 'canceled', message: 'Checkout cancelado. Você pode tentar novamente quando quiser.' });
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (success && sessionId) {
      fetch(`/api/stripe/session/${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data?.plan) {
            const cfg = store.getUserConfig();
            store.saveUserConfig({
              ...cfg,
              plan: data.plan,
              billingCycle: data.billingCycle ?? undefined,
              planStartedAt: new Date().toISOString(),
              planRenewsAt: data.currentPeriodEnd ?? undefined,
              stripeCustomerId: data.customerId ?? undefined,
              stripeSubscriptionId: data.subscriptionId ?? undefined,
            });
            setReturnInfo({
              type: 'success',
              message: `Bem-vindo ao plano ${PLAN_META[data.plan as PlanTier].name}! Tudo liberado.`,
            });
          }
        })
        .catch(err => console.error('Erro ao confirmar sessão:', err))
        .finally(() => {
          window.history.replaceState({}, '', window.location.pathname);
        });
    }
  }, []);

  const priceIdFor = (planId: PlanTier, chosenCycle: 'monthly' | 'yearly'): string | null => {
    if (planId === 'free' || !plans) return null;
    const p = plans.plans.find(pl => pl.id === planId);
    return p?.prices[chosenCycle] ?? null;
  };

  const handleSubscribe = async (planId: PlanTier) => {
    if (planId === 'free' || planId === currentPlan) return;
    const priceId = priceIdFor(planId, cycle);
    if (!priceId) {
      alert('Preço não configurado. Verifique as variáveis STRIPE_PRICE_* no servidor.');
      return;
    }

    setLoadingPlan(planId);
    try {
      const clientReferenceId = userConfig.stripeCustomerId
        || `${userConfig.cnpj || 'anon'}-${Date.now()}`;

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          clientReferenceId,
          successPath: '/?route=planos&success=true&session_id={CHECKOUT_SESSION_ID}',
          cancelPath: '/?route=planos&canceled=true',
        }),
      });
      const { url, error } = await response.json();
      if (error) {
        alert(`Erro: ${error}`);
        return;
      }
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Erro ao iniciar checkout:', err);
      alert('Erro ao iniciar pagamento. Tente novamente.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const orderedPlans: PlanTier[] = useMemo(() => ['free', 'pro', 'business'], []);

  return (
    <div className="min-h-full bg-[#F5F5F7] font-sans">
      <div className="page-container">
        <header className="mb-12">
          <button
            onClick={() => navigate('dashboard')}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 tracking-tight leading-none">Escolha seu plano.</h1>
          <p className="text-zinc-500 mt-4 font-medium max-w-2xl">
            Desbloqueie todo o potencial do Propez. Comece com o Free, evolua quando precisar — sem multa, sem fidelidade.
          </p>
        </header>

        {returnInfo && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-10 p-5 rounded-2xl border ${
              returnInfo.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-zinc-100 border-zinc-200 text-zinc-600'
            }`}
          >
            <p className="text-sm font-semibold">{returnInfo.message}</p>
          </motion.div>
        )}

        {/* Toggle mensal / anual */}
        <div className="mb-10 flex justify-center">
          <div className="inline-flex p-1 bg-white rounded-2xl border border-black/5 shadow-sm">
            {(['monthly', 'yearly'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  cycle === c ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-900'
                }`}
              >
                {c === 'monthly' ? 'Mensal' : 'Anual · 2 meses grátis'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {orderedPlans.map(planId => {
            const meta = PLAN_META[planId];
            const isCurrent = currentPlan === planId;
            const isHighlighted = meta.highlight || targetPlan === planId;
            const price = cycle === 'yearly' ? meta.yearlyMonthlyEquivalent : meta.monthlyPrice;
            const isLoading = loadingPlan === planId;
            const features = PLAN_FEATURES[planId];

            return (
              <motion.div
                key={planId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: orderedPlans.indexOf(planId) * 0.08 }}
                className={`relative p-8 rounded-[2.5rem] border-2 bg-white shadow-sm transition-all ${
                  isHighlighted
                    ? 'border-zinc-900 shadow-xl shadow-zinc-900/10 lg:-translate-y-2'
                    : 'border-transparent hover:border-zinc-200'
                }`}
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 text-white text-[9px] font-bold uppercase tracking-widest">
                    <Sparkles className="w-3 h-3" /> Mais escolhido
                  </div>
                )}

                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${meta.badgeColor} text-[10px] font-bold uppercase tracking-widest mb-6`}>
                  {meta.name}
                </div>

                <p className="text-sm text-zinc-500 mb-6">{meta.tagline}</p>

                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-zinc-900 tracking-tight">R$ {price}</span>
                    {price > 0 && <span className="text-sm text-zinc-400 font-medium">/mês</span>}
                  </div>
                  {planId !== 'free' && cycle === 'yearly' && (
                    <p className="text-xs text-zinc-400 font-medium mt-2">
                      Cobrado anualmente R$ {meta.yearlyTotal} (equivale a R$ {meta.yearlyMonthlyEquivalent}/mês)
                    </p>
                  )}
                  {planId !== 'free' && cycle === 'monthly' && (
                    <p className="text-xs text-zinc-400 font-medium mt-2">
                      Ou R$ {meta.yearlyMonthlyEquivalent}/mês no plano anual
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 min-h-[280px]">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-700">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full h-12 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center">
                    Plano atual
                  </div>
                ) : planId === 'free' ? (
                  <button
                    onClick={() => navigate('dashboard')}
                    className="w-full h-12 rounded-2xl bg-zinc-100 text-zinc-600 font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all"
                  >
                    Continuar no Free
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(planId)}
                    disabled={isLoading}
                    className={`w-full h-12 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${
                      isHighlighted
                        ? 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-black/10'
                        : 'bg-white text-zinc-900 border border-zinc-200 hover:border-zinc-900'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                      </>
                    ) : (
                      `Assinar ${meta.name}`
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-xs text-zinc-400 font-medium">
            Pagamento seguro processado pela Stripe. Cancele quando quiser — sem multa.
          </p>
        </div>
      </div>
    </div>
  );
}

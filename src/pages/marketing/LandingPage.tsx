import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { MarketingLayout } from '../../marketing/MarketingLayout';
import { PageMeta } from '../../marketing/PageMeta';
import { NewsletterSignup } from '../../marketing/NewsletterSignup';
import { PricingSection } from '../../marketing/PricingSection';
import { PropezLogo } from '../../components/PropezLogo';
import { WHATSAPP_URL } from '../../marketing/constants';

const HERO_BULLETS = [
  'Crie propostas profissionais em minutos',
  'Acompanhe o status das suas propostas',
  'Aumente sua taxa de conversão',
] as const;

export default function LandingPage() {
  return (
    <MarketingLayout>
      <PageMeta
        title="Propez — Propostas comerciais"
        description="Plataforma de criação e gestão de propostas comerciais. Builder visual, link público, assinatura e pagamentos."
        path="/"
      />

      {/* Hero — layout split do PropEZ-Saas (login) */}
      <section id="hero" className="relative pt-4 pb-12 md:pb-20">
        <div
          className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23000000' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-zinc-50 via-white to-zinc-100/80" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          <div className="max-w-[1200px] mx-auto overflow-hidden rounded-2xl shadow-2xl border border-black/5 bg-white/90 backdrop-blur-md">
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[min(640px,85vh)]">
              {/* Painel visual — PropEZ login */}
              <div className="relative min-h-[320px] lg:min-h-0 order-2 lg:order-1">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                <div
                  className="absolute inset-0 opacity-20 mix-blend-overlay"
                  style={{
                    backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)`,
                  }}
                />
                <div className="relative z-10 flex flex-col justify-between h-full p-8 sm:p-10 lg:p-12 text-white">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-3">Propez</h2>
                    <p className="text-lg sm:text-xl text-white/90">Plataforma de propostas comerciais</p>
                  </div>
                  <div className="space-y-5 mt-10 lg:mt-0">
                    {HERO_BULLETS.map((text) => (
                      <div key={text} className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-base sm:text-lg text-white/90">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conteúdo — estilo PropEZ page.tsx (bem-vindo + CTAs) */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="flex flex-col justify-center p-8 sm:p-10 lg:p-14 order-1 lg:order-2"
              >
                <div className="mb-8 lg:hidden">
                  <PropezLogo height="md" />
                </div>
                <div className="space-y-4 text-center lg:text-left">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-zinc-900">
                    Bem-vindo ao Propez
                  </h1>
                  <p className="text-zinc-500 text-lg md:text-xl max-w-md mx-auto lg:mx-0">
                    Plataforma de criação e gestão de propostas comerciais
                  </p>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start">
                  <Link to="/cadastro" className="btn-primary px-8 py-3.5 text-base justify-center">
                    Criar conta grátis
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link to="/login" className="btn-secondary px-8 py-3.5 text-base justify-center">
                    Entrar
                  </Link>
                  <a href="#pricing" className="btn-secondary px-8 py-3.5 text-base justify-center">
                    Ver planos
                  </a>
                </div>

                <p className="mt-8 text-sm text-zinc-400 text-center lg:text-left">
                  Comece no plano Free — sem cartão de crédito.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <PricingSection id="pricing" />

      <section className="py-16 bg-zinc-900 text-white">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Dúvidas ou plano Business?</h2>
          <p className="text-white/70 mb-6">Fale com nosso time pelo WhatsApp.</p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-zinc-900 px-8 py-3 rounded-full font-semibold hover:bg-zinc-100"
          >
            Falar com vendas
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <section className="py-14 bg-zinc-50 border-t border-black/5">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <h2 className="text-xl font-bold mb-4">Newsletter</h2>
          <NewsletterSignup />
        </div>
      </section>
    </MarketingLayout>
  );
}

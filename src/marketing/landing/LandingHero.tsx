import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, BarChart3, CheckCircle2, FileText, Users } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';
import { TextScramble } from './TextScramble';
import { MagneticLink } from './MagneticButton';
import { AnimatedCounter } from './AnimatedCounter';
import { Ticker } from './Ticker';
import { useReducedMotion } from './useReducedMotion';

export function LandingHero() {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : 80]);

  return (
    <>
      <section
        ref={ref}
        className="pt-40 pb-20 px-6 overflow-hidden relative min-h-[90vh] flex items-center bg-grid-pattern"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-50 rounded-full blur-[100px] -z-10 opacity-70 pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center w-full relative z-10">
          <AnimatedSection delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-800 text-sm font-bold mb-8 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
              O funil das agências que mais crescem
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2} className="min-h-[140px] md:min-h-[200px]">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 max-w-5xl mb-6 leading-[1.05] font-heading">
              <TextScramble text="Agências que fecham mais não têm melhor serviço. Têm processo comercial mais rápido." />
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mb-12 font-medium leading-relaxed">
              Você gerencia campanha de R$ 50k para o cliente — mas sua própria proposta{' '}
              <br className="hidden md:block" />
              ainda é um PDF perdido no Google Drive ou anexado no WhatsApp?
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.4} className="flex flex-col sm:flex-row items-center gap-6 mb-20 px-4">
            <MagneticLink
              to="/cadastro"
              className="h-16 px-10 bg-black text-white rounded-full font-bold text-lg flex items-center justify-center gap-3 hover:bg-brand-600 transition-colors shadow-2xl shadow-brand-500/20 group w-full sm:w-auto hover-lift"
            >
              Modernizar meu pipeline
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </MagneticLink>
            <a
              href="#solucao"
              className="text-lg font-bold text-gray-600 hover:text-gray-900 transition-colors underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900"
            >
              Ver o processo em ação
            </a>
          </AnimatedSection>

          <AnimatedSection delay={0.5} className="w-full max-w-5xl hero-visual perspective-[2000px]">
            <motion.div
              style={{ y: mockupY }}
              className="relative rounded-2xl border border-gray-200/60 bg-white shadow-[0_40px_120px_rgba(0,0,0,0.12),0_8px_32px_rgba(0,0,0,0.08)] p-2 md:p-4 transform-gpu hover:scale-[1.01] transition-transform duration-700 ease-out"
            >
              <div
                style={reducedMotion ? undefined : { transform: 'rotateX(2deg) rotateY(-1deg)' }}
                className="transform-gpu transition-all duration-700 ease-out"
              >
                <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-[16/9] relative flex flex-col">
                  <div className="absolute inset-x-0 top-0 h-12 bg-white border-b border-gray-100 flex items-center px-4 gap-2 z-20">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <div className="ml-4 h-6 w-full max-w-sm bg-gray-100 text-gray-400 text-xs flex items-center px-3 rounded-md font-mono truncate">
                      propez.app/dashboard/pipeline
                    </div>
                  </div>

                  <div className="w-full h-full mt-12 grid grid-cols-4 gap-6 p-4 md:p-8">
                    <div className="col-span-1 border-r border-gray-200 pr-6 space-y-6 hidden md:block">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 rounded bg-brand-500" />
                        <div className="h-4 w-20 bg-gray-200 rounded" />
                      </div>
                      <div className="space-y-4">
                        <div className="h-8 w-full bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-3/4 bg-gray-100 rounded" />
                        <div className="h-8 w-5/6 bg-gray-100 rounded" />
                      </div>
                    </div>

                    <div className="col-span-4 md:col-span-3 space-y-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-2xl text-gray-900 font-heading">Pipeline Comercial</h3>
                          <p className="text-gray-500 text-sm">Visão geral deste mês</p>
                        </div>
                        <div className="h-10 w-32 bg-brand-500 rounded-lg hidden sm:block" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group hover:border-brand-500 transition-colors">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <BarChart3 className="w-12 h-12 text-blue-500" />
                          </div>
                          <p className="text-sm font-medium text-gray-500 mb-2">Propostas Ativas</p>
                          <p className="text-3xl font-bold text-gray-900">
                            <AnimatedCounter target={24} />
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group hover:border-brand-500 transition-colors">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Users className="w-12 h-12 text-brand-500" />
                          </div>
                          <p className="text-sm font-medium text-gray-500 mb-2">Leads Lendo Agora</p>
                          <p className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <AnimatedCounter target={8} />
                            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse mt-1" />
                          </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm relative overflow-hidden group">
                          <div className="absolute inset-0 bg-brand-50/50" />
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <FileText className="w-12 h-12 text-brand-500" />
                          </div>
                          <div className="relative">
                            <p className="text-sm font-medium text-brand-700 mb-2">MRR Fechado</p>
                            <p className="text-3xl font-bold text-brand-600">
                              <AnimatedCounter target={38500} isCurrency />
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hidden sm:block">
                        <div className="h-12 bg-gray-50 border-b border-gray-100 flex items-center px-6">
                          <div className="h-4 w-32 bg-gray-200 rounded" />
                        </div>
                        <div className="p-6 space-y-4">
                          {[1, 2].map((i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between pb-4 border-b border-gray-50 last:border-0 last:pb-0"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-100" />
                                <div>
                                  <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                                  <div className="h-3 w-32 bg-gray-100 rounded" />
                                </div>
                              </div>
                              <div className="h-6 w-24 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
      <Ticker />
    </>
  );
}

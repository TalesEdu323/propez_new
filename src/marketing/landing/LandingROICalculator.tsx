import { useState } from 'react';
import { Calculator, Clock, DollarSign } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';
import { LANDING_ROI } from '../siteCopy';

export function LandingROICalculator() {
  const [proposals, setProposals] = useState(15);
  const [hoursPerProposal, setHoursPerProposal] = useState(2);
  const [hourlyRate, setHourlyRate] = useState(60);

  const currentHours = proposals * hoursPerProposal;
  const propezHours = currentHours * 0.2;
  const savedHours = Math.round(currentHours - propezHours);
  const savedMoneyYear = Math.round(savedHours * hourlyRate) * 12;

  return (
    <section className="py-32 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-sm font-bold mb-6">
            <Calculator className="w-4 h-4" aria-hidden />
            {LANDING_ROI.badge}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-heading text-balance">{LANDING_ROI.h2}</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium text-balance">
            {LANDING_ROI.subtitle}
          </p>
        </AnimatedSection>

        <AnimatedSection
          delay={0.2}
          className="max-w-6xl mx-auto bg-gray-50 rounded-[2rem] p-6 md:p-12 border border-gray-200 shadow-xl shadow-gray-200/50 hover-lift"
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10">
              <div>
                <div className="flex justify-between items-end mb-4">
                  <label htmlFor="roi-proposals" className="font-bold text-gray-900 block text-lg">
                    Propostas enviadas (mês)
                  </label>
                  <span className="text-3xl font-black text-brand-600" aria-live="polite">
                    {proposals}
                  </span>
                </div>
                <input
                  id="roi-proposals"
                  type="range"
                  min={1}
                  max={100}
                  value={proposals}
                  onChange={(e) => setProposals(Number(e.target.value))}
                  aria-valuemin={1}
                  aria-valuemax={100}
                  aria-valuenow={proposals}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-4">
                  <label htmlFor="roi-hours" className="font-bold text-gray-900 block text-lg">
                    Tempo por proposta <span className="text-gray-400 font-medium">(horas)</span>
                  </label>
                  <span className="text-3xl font-black text-brand-600" aria-live="polite">
                    {hoursPerProposal}
                  </span>
                </div>
                <input
                  id="roi-hours"
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={hoursPerProposal}
                  onChange={(e) => setHoursPerProposal(Number(e.target.value))}
                  aria-valuemin={0.5}
                  aria-valuemax={10}
                  aria-valuenow={hoursPerProposal}
                  className="w-full"
                />
                <p className="text-sm text-gray-500 mt-3 font-medium">
                  Inclui montagem do PDF, envio, follow-ups e validação de cobrança.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-end mb-4">
                  <label htmlFor="roi-rate" className="font-bold text-gray-900 block text-lg">
                    Custo da hora da equipe
                  </label>
                  <span className="text-3xl font-black text-brand-600" aria-live="polite">
                    R$ {hourlyRate}
                  </span>
                </div>
                <input
                  id="roi-rate"
                  type="range"
                  min={15}
                  max={300}
                  step={5}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  aria-valuemin={15}
                  aria-valuemax={300}
                  aria-valuenow={hourlyRate}
                  className="w-full"
                />
              </div>
            </div>

            <div className="bg-gray-900 rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden flex flex-col justify-center h-full shadow-2xl">
              <div className="absolute top-1/2 right-0 -translate-y-1/2 p-8 opacity-[0.03] pointer-events-none">
                <DollarSign className="w-96 h-96" aria-hidden />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-brand-500/20 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10 space-y-12">
                <div>
                  <p className="text-gray-400 font-bold mb-3 flex items-center gap-3 text-lg">
                    <Clock className="w-6 h-6 text-brand-500" aria-hidden />
                    Tempo economizado mensalmente
                  </p>
                  <div className="text-5xl md:text-6xl font-black text-white">
                    {savedHours} <span className="text-3xl text-gray-500 font-bold">horas</span>
                  </div>
                </div>

                <div className="h-px bg-gray-800 w-full relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
                </div>

                <div>
                  <p className="text-gray-400 font-bold mb-3 flex items-center gap-3 text-lg">
                    <DollarSign className="w-6 h-6 text-brand-500" aria-hidden />
                    {LANDING_ROI.savedMoneyLabel}
                  </p>
                  <div
                    className="text-6xl md:text-7xl font-black text-brand-500 tracking-tight"
                    style={{ textShadow: '0 0 40px rgba(249,115,22,0.4)' }}
                  >
                    R$ {savedMoneyYear.toLocaleString('pt-BR')}
                  </div>
                  <p className="text-base text-gray-400 mt-6 leading-relaxed font-medium text-balance">
                    {LANDING_ROI.savedMoneyNote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

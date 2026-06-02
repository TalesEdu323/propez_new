import { motion } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ProposalFlowStep } from '../../types/proposalFlow';
import { DEFAULT_FLOW } from '../../types/proposalFlow';
import type { CriarModeloFormData, SetCriarModeloFormData } from './types';

const STEP_META: Record<ProposalFlowStep, { label: string; desc: string }> = {
  approve: { label: 'Aprovar proposta', desc: 'Cliente confirma interesse na proposta' },
  sign: { label: 'Assinar contrato', desc: 'Assinatura digital integrada na PropEZ (PDF + link)' },
  pay: { label: 'Pagar', desc: 'PIX ou link de pagamento após contrato' },
};

const ALL_STEPS: ProposalFlowStep[] = ['approve', 'sign', 'pay'];

export interface StepFluxoProps {
  formData: CriarModeloFormData;
  setFormData: SetCriarModeloFormData;
}

export function StepFluxo({ formData, setFormData }: StepFluxoProps) {
  const fluxo = formData.fluxo ?? DEFAULT_FLOW;
  const ordered = fluxo.steps;

  const toggle = (step: ProposalFlowStep) => {
    if (step === 'approve') return;
    setFormData((prev) => {
      const current = prev.fluxo?.steps ?? DEFAULT_FLOW.steps;
      const has = current.includes(step);
      const next = has ? current.filter((s) => s !== step) : [...current, step];
      if (!next.includes('approve')) next.unshift('approve');
      return { ...prev, fluxo: { steps: next } };
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...ordered];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setFormData((prev) => ({ ...prev, fluxo: { steps: next } }));
  };

  const inactive = ALL_STEPS.filter((s) => !ordered.includes(s));

  return (
    <motion.div key="fluxo" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="section-title font-semibold mb-2">Fluxo da proposta</h2>
      <p className="text-zinc-500 mb-10">
        Defina a ordem dos passos que o cliente percorrerá no link público. O passo &quot;Aprovar proposta&quot; é obrigatório.
      </p>

      <div className="space-y-3">
        {ordered.map((step, index) => (
          <div
            key={step}
            className="flex items-center gap-4 p-4 rounded-2xl border border-black/10 bg-zinc-50/80"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="p-1 rounded-lg hover:bg-white disabled:opacity-30"
                aria-label="Subir"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={index === ordered.length - 1}
                onClick={() => move(index, 1)}
                className="p-1 rounded-lg hover:bg-white disabled:opacity-30"
                aria-label="Descer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-zinc-900">{STEP_META[step].label}</div>
              <div className="text-sm text-zinc-500">{STEP_META[step].desc}</div>
            </div>
            {step !== 'approve' && (
              <button
                type="button"
                onClick={() => toggle(step)}
                className="text-xs font-bold uppercase tracking-widest text-red-600 hover:text-red-700"
              >
                Remover
              </button>
            )}
          </div>
        ))}
      </div>

      {inactive.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Adicionar passo</p>
          <div className="flex flex-wrap gap-2">
            {inactive.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => toggle(step)}
                className="px-4 py-2 rounded-xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-700 hover:border-zinc-900"
              >
                + {STEP_META[step].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

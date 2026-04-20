import { Check, ChevronLeft } from 'lucide-react';
import { formatBRL } from '../../lib/format';
import type { PropezFluidoFormData, StepDescriptor } from './types';

export interface WizardStepperProps {
  step: number;
  steps: StepDescriptor[];
  isEditing: boolean;
  formData: PropezFluidoFormData;
  onBack: () => void;
}

/**
 * Painel lateral esquerdo do fluxo de criação de proposta.
 * Mostra o stepper vertical, o título "Criar/Editar" e o resumo ao vivo
 * dos dados já preenchidos.
 */
export function WizardStepper({ step, steps, isEditing, formData, onBack }: WizardStepperProps) {
  return (
    <div className="w-[32%] min-w-[360px] max-w-[440px] bg-zinc-900 text-white p-12 flex flex-col justify-between relative overflow-hidden hidden md:flex">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-zinc-700 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-zinc-800 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/30 hover:text-white transition-all text-[10px] font-bold uppercase tracking-[0.25em] mb-20 group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Voltar
        </button>

        <h1 className="text-5xl font-semibold tracking-tightest mb-6 leading-none">
          {isEditing ? 'Editar.' : 'Criar.'}
        </h1>
        <p className="text-white/40 text-sm mb-20 leading-relaxed max-w-[300px] font-medium">
          Configure os detalhes passo a passo para gerar uma proposta matadora e profissional.
        </p>

        <div className="space-y-12">
          {steps.map((s) => (
            <div key={s.id} className="flex items-start gap-6 group cursor-default">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-700 ${
                step > s.id ? 'bg-white border-white text-black' :
                step === s.id ? 'border-white text-white shadow-[0_0_30px_rgba(255,255,255,0.15)]' : 'border-white/10 text-white/10'
              }`}>
                {step > s.id ? <Check className="w-5 h-5" /> : <span className="text-[10px] font-bold">{s.id}</span>}
              </div>
              <div className={`pt-1.5 transition-all duration-500 ${step >= s.id ? 'opacity-100' : 'opacity-20'}`}>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2">{s.title}</h3>
                <p className="text-[11px] text-white/40 font-medium tracking-tight">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-3xl shadow-2xl">
          <h4 className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/20 mb-8">Resumo da Proposta</h4>
          <div className="space-y-6 text-sm">
            <div className="flex justify-between items-center border-b border-white/5 pb-5">
              <span className="text-white/30 font-medium">Cliente</span>
              <span className="font-semibold text-right max-w-[160px] truncate tracking-tight">{formData.clienteNome || '-'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-5">
              <span className="text-white/30 font-medium">Serviços</span>
              <span className="font-semibold tracking-tight">{formData.servicos.length} itens</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-white/30 font-medium">Investimento</span>
              <span className="font-bold text-2xl text-white tracking-tightest">
                {formData.valor ? formatBRL(formData.valor) : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

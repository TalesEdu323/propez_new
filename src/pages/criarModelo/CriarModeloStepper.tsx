import { Check, ChevronLeft } from 'lucide-react';
import type { CriarModeloFormData, CriarModeloStepDescriptor } from './types';

export interface CriarModeloStepperProps {
  step: number;
  steps: CriarModeloStepDescriptor[];
  isEditing: boolean;
  formData: CriarModeloFormData;
  onBack: () => void;
}

/**
 * Painel lateral esquerdo do fluxo de criação/edição de modelo de proposta.
 * Mantém layout visual idêntico ao anterior (rounded-full, largura 30%).
 */
export function CriarModeloStepper({ step, steps, isEditing, formData, onBack }: CriarModeloStepperProps) {
  return (
    <div className="w-[30%] min-w-[320px] max-w-[400px] bg-[#0a0a0a] text-white p-10 flex flex-col justify-between relative overflow-hidden hidden md:flex">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-16"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>

        <h1 className="text-4xl font-semibold tracking-tight mb-4 leading-tight">
          {isEditing ? 'Editar Modelo' : 'Novo Modelo'}
        </h1>
        <p className="text-white/50 text-sm mb-16 leading-relaxed">
          Crie templates reutilizáveis para agilizar a criação de propostas futuras.
        </p>

        <div className="space-y-8">
          {steps.map((s) => (
            <div key={s.id} className="flex items-start gap-5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${
                step > s.id ? 'bg-white border-white text-black' :
                step === s.id ? 'border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-white/20 text-white/20'
              }`}>
                {step > s.id ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{s.id}</span>}
              </div>
              <div className={`pt-1.5 transition-all duration-300 ${step >= s.id ? 'opacity-100' : 'opacity-40'}`}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-1">{s.title}</h3>
                <p className="text-sm text-white/50">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">Resumo do Modelo</h4>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-white/60">Nome</span>
              <span className="font-medium text-right max-w-[150px] truncate">{formData.nome || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60">Serviços Inclusos</span>
              <span className="font-medium">{formData.servicos.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

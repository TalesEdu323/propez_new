import { useState } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, LayoutTemplate, Plus, Lock, Sparkles } from 'lucide-react';
import type { ModeloProposta } from '../../lib/store';
import { resolvePlan } from '../../lib/store';
import {
  getTemplateRequiredPlan,
  isTemplateAllowed,
  PLAN_META,
  type PlanTier,
} from '../../lib/featureFlags';
import { useUserConfig } from '../../hooks/useStoreEntity';
import { UpgradeGate } from '../../components/UpgradeGate';
import type { PropezFluidoFormData } from './types';

export interface Step1Props {
  modelos: ModeloProposta[];
  formData: PropezFluidoFormData;
  onSelectModelo: (modeloId: string) => void;
  onNext: () => void;
  onOpenModelos?: () => void;
}

/**
 * Step 1 do wizard: escolha de modelo base para iniciar a proposta.
 * Mantém o layout em grid de cards com opção "Começar do Zero".
 */
export function Step1ModeloSelect({ modelos, formData, onSelectModelo, onNext, onOpenModelos }: Step1Props) {
  const userConfig = useUserConfig();
  const plan = resolvePlan(userConfig);
  const [gate, setGate] = useState<{ open: boolean; requiredPlan: PlanTier; nome: string }>({
    open: false,
    requiredPlan: 'pro',
    nome: '',
  });

  const handleSelect = (m: ModeloProposta) => {
    if (!isTemplateAllowed(plan, m.tier)) {
      setGate({ open: true, requiredPlan: getTemplateRequiredPlan(m.tier), nome: m.nome });
      return;
    }
    onSelectModelo(m.id);
    onNext();
  };

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-12">
        <h2 className="section-title font-semibold mb-2">Escolha um Modelo Base</h2>
        <p className="text-zinc-500 text-lg">
          Selecione um template para preencher automaticamente os serviços, valores, layout e o contrato da proposta.
        </p>
        {onOpenModelos && (
          <p className="mt-3 text-sm text-zinc-600">
            Quer criar ou editar modelos?{' '}
            <button
              type="button"
              onClick={onOpenModelos}
              className="inline-flex items-center gap-1 font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
            >
              Abrir página de Modelos
              <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
            </button>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <motion.div
          className="p-8 rounded-[2.5rem] border-2 border-dashed border-zinc-200 bg-zinc-50/60 flex flex-col items-center justify-center text-center min-h-[220px] shadow-sm opacity-80"
        >
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-6">
            <Plus className="w-8 h-8 text-zinc-900" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-700">Começar do Zero</h3>
          <p className="text-sm text-zinc-500 mt-2">Indisponível neste fluxo. Selecione um modelo para gerar a proposta.</p>
        </motion.div>

        {modelos.map(m => {
          const locked = !isTemplateAllowed(plan, m.tier);
          const requiredPlan = getTemplateRequiredPlan(m.tier);
          const planMeta = PLAN_META[requiredPlan];
          return (
            <motion.div
              key={m.id}
              whileHover={{ y: locked ? 0 : -4 }}
              onClick={() => handleSelect(m)}
              className={`relative p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 flex flex-col min-h-[220px] shadow-sm ${
                locked
                  ? 'border-dashed border-zinc-200 bg-zinc-50/60 hover:border-amber-300'
                  : formData.modeloId === m.id
                    ? 'border-zinc-900 bg-white shadow-xl shadow-zinc-900/5'
                    : 'border-transparent bg-white hover:border-zinc-200'
              }`}
            >
              {locked && (
                <div className={`absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full ${planMeta.badgeColor} text-[10px] font-bold uppercase tracking-widest`}>
                  <Lock className="w-3 h-3" />
                  {planMeta.name}
                </div>
              )}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-auto ${locked ? 'bg-amber-50 text-amber-500' : 'bg-zinc-50 text-zinc-900'}`}>
                {locked ? <Sparkles className="w-7 h-7" /> : <LayoutTemplate className="w-7 h-7" />}
              </div>
              <div className="mt-8">
                <h3 className={`text-lg font-semibold ${locked ? 'text-zinc-500' : 'text-zinc-900'}`}>{m.nome}</h3>
                <p className="text-sm text-zinc-500 mt-1">{m.servicos.length} serviços inclusos</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <UpgradeGate
        open={gate.open}
        onClose={() => setGate(prev => ({ ...prev, open: false }))}
        feature={gate.nome || 'Este modelo'}
        reason={gate.nome ? `O modelo "${gate.nome}" está disponível a partir do plano ${PLAN_META[gate.requiredPlan].name}.` : undefined}
        requiredPlan={gate.requiredPlan}
      />
    </motion.div>
  );
}

import { useState } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, LayoutTemplate, Plus, Lock, Sparkles, Eye } from 'lucide-react';
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
import { AiLayoutPreviewModal } from '../../components/ia/AiLayoutPreviewModal';
import { normalizePageLayout } from '../../lib/pageLayout';
import type { PropezFluidoFormData } from './types';

export interface Step1Props {
  modelos: ModeloProposta[];
  formData: PropezFluidoFormData;
  onSelectModelo: (modeloId: string) => void;
  onNext: () => void;
  onOpenModelos?: () => void;
  onOpenLoja?: () => void;
}

/**
 * Step 1 do wizard: escolha de modelo base para iniciar a proposta.
 * Abre preview do layout antes de confirmar e avançar.
 */
export function Step1ModeloSelect({ modelos, formData, onSelectModelo, onNext, onOpenModelos, onOpenLoja }: Step1Props) {
  const userConfig = useUserConfig();
  const plan = resolvePlan(userConfig);
  const [gate, setGate] = useState<{ open: boolean; requiredPlan: PlanTier; nome: string }>({
    open: false,
    requiredPlan: 'pro',
    nome: '',
  });
  const [previewModelo, setPreviewModelo] = useState<ModeloProposta | null>(null);

  const openPreview = (m: ModeloProposta) => {
    if (!isTemplateAllowed(plan, m.tier)) {
      setGate({ open: true, requiredPlan: getTemplateRequiredPlan(m.tier), nome: m.nome });
      return;
    }
    setPreviewModelo(m);
  };

  const handleConfirmModelo = () => {
    if (!previewModelo) return;
    onSelectModelo(previewModelo.id);
    setPreviewModelo(null);
    onNext();
  };

  return (
    <>
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
            Selecione um template para ver o preview do layout antes de continuar.
          </p>
          <p className="mt-3 text-sm text-zinc-600">
            {onOpenLoja && (
              <>
                <button
                  type="button"
                  onClick={onOpenLoja}
                  className="inline-flex items-center gap-1 font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
                >
                  Loja de templates
                </button>
                {onOpenModelos ? ' · ' : null}
              </>
            )}
            {onOpenModelos && (
              <button
                type="button"
                onClick={onOpenModelos}
                className="inline-flex items-center gap-1 font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
              >
                Meus modelos
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
              </button>
            )}
          </p>
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

          {modelos.map((m) => {
            const locked = !isTemplateAllowed(plan, m.tier);
            const requiredPlan = getTemplateRequiredPlan(m.tier);
            const planMeta = PLAN_META[requiredPlan];
            const isSelected = formData.modeloId === m.id;
            return (
              <motion.div
                key={m.id}
                whileHover={{ y: locked ? 0 : -4 }}
                onClick={() => openPreview(m)}
                className={`relative p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 flex flex-col min-h-[220px] shadow-sm ${
                  locked
                    ? 'border-dashed border-zinc-200 bg-zinc-50/60 hover:border-amber-300'
                    : isSelected
                      ? 'border-zinc-900 bg-white shadow-xl shadow-zinc-900/5'
                      : 'border-transparent bg-white hover:border-zinc-200'
                }`}
              >
                {locked && (
                  <div
                    className={`absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full ${planMeta.badgeColor} text-[10px] font-bold uppercase tracking-widest`}
                  >
                    <Lock className="w-3 h-3" />
                    {planMeta.name}
                  </div>
                )}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-auto ${locked ? 'bg-amber-50 text-amber-500' : 'bg-zinc-50 text-zinc-900'}`}
                >
                  {locked ? <Sparkles className="w-7 h-7" /> : <LayoutTemplate className="w-7 h-7" />}
                </div>
                <div className="mt-8">
                  <h3 className={`text-lg font-semibold ${locked ? 'text-zinc-500' : 'text-zinc-900'}`}>{m.nome}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{m.servicos.length} serviços inclusos</p>
                  {!locked && (
                    <p className="text-xs text-zinc-400 mt-3 inline-flex items-center gap-1 font-medium">
                      <Eye className="w-3.5 h-3.5" />
                      Clique para ver o preview
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <UpgradeGate
          open={gate.open}
          onClose={() => setGate((prev) => ({ ...prev, open: false }))}
          feature={gate.nome || 'Este modelo'}
          reason={
            gate.nome
              ? `O modelo "${gate.nome}" está disponível a partir do plano ${PLAN_META[gate.requiredPlan].name}.`
              : undefined
          }
          requiredPlan={gate.requiredPlan}
        />
      </motion.div>

      <AiLayoutPreviewModal
        open={!!previewModelo}
        elementos={previewModelo?.elementos ?? []}
        pageLayout={normalizePageLayout(previewModelo?.pageLayout)}
        title={previewModelo ? `Preview — ${previewModelo.nome}` : 'Preview do modelo'}
        description="Revise o layout da página antes de usar este modelo na proposta."
        acceptLabel="Usar este modelo e continuar"
        onClose={() => setPreviewModelo(null)}
        onAccept={handleConfirmModelo}
      />
    </>
  );
}

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { UpgradeGate } from '../UpgradeGate';
import { useUserConfig } from '../../hooks/useStoreEntity';
import { canUse, type PlanTier } from '../../lib/featureFlags';
import { iaApi, getIaErrorMessage, getIaRequiredPlan } from '../../lib/iaApi';
import type { BuilderElement } from '../../types/builder';

export type AiBriefMode = 'layout' | 'contract';

export interface AiBriefPromptModalProps {
  open: boolean;
  onClose: () => void;
  mode: AiBriefMode;
  onLayoutGenerated?: (elementos: BuilderElement[]) => void;
  onContractGenerated?: (result: { titulo: string; texto: string }) => void;
}

const COPY: Record<
  AiBriefMode,
  { title: string; description: string; placeholder: string; disclaimer?: string }
> = {
  layout: {
    title: 'Gerar modelo de proposta',
    description: 'Descreva em poucas linhas o tipo de proposta que você imagina.',
    placeholder:
      'Ex.: Proposta de consultoria B2B por 90 dias, com diagnóstico, plano de ação e acompanhamento quinzenal.',
  },
  contract: {
    title: 'Gerar contrato',
    description: 'Descreva brevemente o contrato que você precisa.',
    placeholder:
      'Ex.: Consultoria de marketing digital, 6 meses, pagamento 50% na assinatura e 50% na entrega.',
    disclaimer: 'Rascunho gerado por IA. Revise com advogado antes de usar.',
  },
};

export function AiBriefPromptModal({
  open,
  onClose,
  mode,
  onLayoutGenerated,
  onContractGenerated,
}: AiBriefPromptModalProps) {
  const userConfig = useUserConfig();
  const gate = canUse('ia.generate', userConfig);
  const copy = COPY[mode];

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [requiredPlan, setRequiredPlan] = useState<PlanTier>('pro');

  const handleClose = () => {
    if (loading) return;
    setPrompt('');
    setError(null);
    onClose();
  };

  const handleGenerate = async () => {
    if (!gate.allowed) {
      setUpgradeReason(gate.reason);
      setRequiredPlan(gate.requiredPlan ?? 'pro');
      setUpgradeOpen(true);
      return;
    }

    const trimmed = prompt.trim();
    if (trimmed.length < 20) {
      setError('Descreva com pelo menos 20 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (mode === 'layout') {
        const { elementos } = await iaApi.generateLayout(trimmed);
        onLayoutGenerated?.(elementos);
        setPrompt('');
        onClose();
      } else {
        const result = await iaApi.generateContract(trimmed);
        onContractGenerated?.(result);
        setPrompt('');
        onClose();
      }
    } catch (err) {
      const plan = getIaRequiredPlan(err);
      if (plan && plan !== 'free') {
        setUpgradeReason(getIaErrorMessage(err));
        setRequiredPlan(plan);
        setUpgradeOpen(true);
      } else {
        setError(getIaErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <UpgradeGate
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="IA generativa"
        reason={upgradeReason}
        requiredPlan={requiredPlan}
      />
    );
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        size="md"
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            {copy.title}
          </span>
        }
        description={copy.description}
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading}
              className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar
                </>
              )}
            </button>
          </>
        }
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={copy.placeholder}
          rows={5}
          maxLength={2000}
          disabled={loading}
          className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/5 resize-none disabled:opacity-60"
        />
        <p className="text-[10px] text-zinc-400 mt-2 text-right">{prompt.length}/2000</p>
        {copy.disclaimer ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
            {copy.disclaimer}
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
        {!gate.allowed ? (
          <p className="text-xs text-zinc-500 mt-3">
            Recurso disponível a partir do plano Pro.{' '}
            <button
              type="button"
              className="underline font-medium"
              onClick={() => {
                setUpgradeReason(gate.reason);
                setRequiredPlan(gate.requiredPlan ?? 'pro');
                setUpgradeOpen(true);
              }}
            >
              Ver planos
            </button>
          </p>
        ) : gate.remaining != null && gate.limit != null ? (
          <p className="text-xs text-zinc-400 mt-3">
            {gate.remaining} de {gate.limit} gerações restantes este mês
          </p>
        ) : null}
      </Modal>

      <UpgradeGate
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="IA generativa"
        reason={upgradeReason}
        requiredPlan={requiredPlan}
      />
    </>
  );
}

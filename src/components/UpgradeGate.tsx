import { Sparkles, Lock } from 'lucide-react';
import { Modal } from './ui/Modal';
import { PLAN_META, type PlanTier } from '../lib/featureFlags';
import { requestPlanosNavigation } from '../lib/navigationEvents';

export interface UpgradeGateProps {
  open: boolean;
  onClose: () => void;
  /** Título curto da feature bloqueada. Ex.: "Criar mais propostas". */
  feature?: string;
  /** Mensagem adicional explicando o bloqueio. */
  reason?: string;
  /** Plano mínimo necessário. Default: 'pro'. */
  requiredPlan?: PlanTier;
}

/**
 * Modal reutilizável de bloqueio por plano. Mostra o plano necessário com
 * destaque e um botão que leva o usuário à página de planos (via event bus).
 */
export function UpgradeGate({
  open,
  onClose,
  feature = 'Este recurso',
  reason,
  requiredPlan = 'pro',
}: UpgradeGateProps) {
  const meta = PLAN_META[requiredPlan];

  return (
    <Modal open={open} onClose={onClose} size="sm" closeOnBackdropClick>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-6 border border-amber-100">
          <Lock className="w-7 h-7" />
        </div>

        <h3 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">
          {feature} é um recurso {meta.name}
        </h3>

        {reason ? (
          <p className="text-sm text-zinc-500 leading-relaxed mb-6">{reason}</p>
        ) : (
          <p className="text-sm text-zinc-500 leading-relaxed mb-6">
            Faça upgrade e desbloqueie tudo que o plano {meta.name} oferece.
          </p>
        )}

        <div className={`p-5 rounded-2xl bg-gradient-to-br ${requiredPlan === 'business' ? 'from-violet-50 to-violet-100/60' : 'from-amber-50 to-amber-100/60'} border ${requiredPlan === 'business' ? 'border-violet-200' : 'border-amber-200'} mb-6`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className={`w-4 h-4 ${meta.accentClass}`} />
            <span className={`text-[11px] font-bold uppercase tracking-widest ${meta.accentClass}`}>
              Plano {meta.name}
            </span>
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold text-zinc-900 tracking-tight">
              R$ {meta.monthlyPrice}
            </span>
            <span className="text-xs text-zinc-500 font-medium">/mês</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
            ou R$ {meta.yearlyMonthlyEquivalent}/mês no anual
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              requestPlanosNavigation({ targetPlan: requiredPlan, feature });
              onClose();
            }}
            className="w-full h-12 bg-zinc-900 text-white font-semibold text-sm rounded-2xl hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-lg shadow-black/10"
          >
            Ver planos e fazer upgrade
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 text-xs font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors"
          >
            Continuar no plano atual
          </button>
        </div>
      </div>
    </Modal>
  );
}

export type PropostaStatus = 'pendente' | 'aprovada' | 'recusada';

const CLASSES: Record<PropostaStatus, string> = {
  aprovada: 'bg-emerald-50 text-emerald-600',
  recusada: 'bg-red-50 text-red-600',
  pendente: 'bg-amber-50 text-amber-600',
};

const LABELS: Record<PropostaStatus, string> = {
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  pendente: 'Pendente',
};

export interface StatusBadgeProps {
  status: PropostaStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={['inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', CLASSES[status], className].join(' ')}>
      {LABELS[status]}
    </span>
  );
}

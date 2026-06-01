import { ServiceRequestLauncher } from './ServiceRequestLauncher';

interface PricingEnterpriseCtaProps {
  className?: string;
  /** Landing pública: abre cadastro se precisar de login para formulário nativo. */
  marketing?: boolean;
}

export function PricingEnterpriseCta({ className = '', marketing = false }: PricingEnterpriseCtaProps) {
  return (
    <ServiceRequestLauncher
      type="enterprise"
      requireAuthForNative={marketing}
      onNeedLogin={marketing ? () => { window.location.href = '/cadastro?plan=business'; } : undefined}
    >
      {({ open, loading }) => (
        <button
          type="button"
          onClick={open}
          disabled={loading}
          className={className}
        >
          {loading ? 'Carregando…' : 'Falar com vendas'}
        </button>
      )}
    </ServiceRequestLauncher>
  );
}
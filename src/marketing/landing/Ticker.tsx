import { useReducedMotion } from './useReducedMotion';

const items = [
  'Proposta enviada',
  'Lead abriu o link',
  'Lendo a seção de preços',
  'Assinatura coletada',
  'Pagamento aprovado',
  'Proposta aceita',
];

export function Ticker() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="w-full bg-brand-500 py-3 overflow-hidden flex whitespace-nowrap border-y border-brand-600 relative z-20">
      <div className={`flex items-center ${reducedMotion ? 'flex-wrap justify-center gap-4 px-4' : 'animate-ticker'}`}>
        {[...Array(reducedMotion ? 1 : 4)].map((_, i) => (
          <div key={i} className="flex items-center">
            {items.map((item, j) => (
              <div
                key={`${i}-${j}`}
                className="flex items-center text-white/90 font-medium tracking-wide px-8 uppercase text-sm"
              >
                {item}
                <span className="mx-8 text-white/40">✦</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

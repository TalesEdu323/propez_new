import { CheckCircle, Loader2 } from 'lucide-react';
import type { JourneyMethod, JourneyMethodId, OrgBrand } from './signTypes';
import { SignWizardWrapper } from './SignWizardWrapper';

interface Props {
  methods: JourneyMethod[];
  completedCount: number;
  totalSteps: number;
  nextMethodId: JourneyMethodId | null;
  allCompleted: boolean;
  completing: boolean;
  completeError: string | null;
  org?: OrgBrand | null;
  onSelectMethod: (id: JourneyMethodId) => void;
  onComplete: () => void;
  onBack: () => void;
}

export function SignAuthSelectView({
  methods,
  completedCount,
  totalSteps,
  nextMethodId,
  allCompleted,
  completing,
  completeError,
  org,
  onSelectMethod,
  onComplete,
  onBack,
}: Props) {
  const progress = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  return (
    <SignWizardWrapper
      title="Validação de Autenticação"
      subtitle="Complete os passos abaixo para garantir a segurança da assinatura."
      backAction={onBack}
      org={org}
    >
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Progresso</span>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
          {completedCount} de {totalSteps}
        </span>
      </div>
      <div className="h-1 w-full bg-gray-100">
        <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="p-6 sm:p-8 space-y-4">
        {methods.map((method, index) => {
          const isCompleted = method.completed;
          const isNext = method.id === nextMethodId && !isCompleted;
          const isBlocked = Boolean(nextMethodId) && method.id !== nextMethodId && !isCompleted;
          const canClick = method.available && isNext && !isBlocked && !isCompleted;
          const cardClass = isCompleted
            ? 'border-green-200 bg-green-50/30'
            : isBlocked
              ? 'border-gray-200 bg-gray-50 opacity-60'
              : isNext
                ? 'border-blue-500 ring-1 ring-blue-500 bg-white shadow-sm'
                : 'border-gray-200 bg-white';
          const circleClass = isCompleted
            ? 'bg-green-500 text-white'
            : isBlocked
              ? 'bg-gray-300 text-gray-500'
              : 'bg-blue-600 text-white';

          return (
            <div key={method.id} className={`border rounded-xl p-5 transition-all flex items-center gap-4 ${cardClass}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${circleClass}`}>
                {isCompleted ? <CheckCircle className="w-6 h-6" /> : index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg">{method.name}</h3>
                <p className="text-sm text-gray-500">{method.description}</p>
              </div>
              {isCompleted ? (
                <span className="text-green-600 font-bold text-sm bg-green-100 px-4 py-2 rounded-lg flex-shrink-0">Concluído</span>
              ) : canClick ? (
                <button
                  type="button"
                  onClick={() => onSelectMethod(method.id)}
                  className="bg-blue-600 text-white font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex-shrink-0"
                >
                  Validar
                </button>
              ) : (
                <span className="text-gray-400 font-bold text-sm bg-gray-100 px-4 py-2 rounded-lg flex-shrink-0">Aguardando</span>
              )}
            </div>
          );
        })}

        {completeError && <p className="text-sm text-red-600 text-center">{completeError}</p>}

        {allCompleted && (
          <div className="pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onComplete}
              disabled={completing}
              className="w-full bg-[#1877F2] hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {completing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Finalizando...
                </>
              ) : (
                'Concluir e ver confirmação'
              )}
            </button>
          </div>
        )}
      </div>
    </SignWizardWrapper>
  );
}

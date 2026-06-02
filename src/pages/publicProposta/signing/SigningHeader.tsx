import { useState } from 'react';
import { ChevronDown, Check, Clock } from 'lucide-react';
import { PropezLogo } from '../../../components/PropezLogo';
import type { OrgBrand } from './signTypes';

export interface SigningHeaderSigner {
  name: string;
  email: string;
  status: 'pending' | 'completed';
  me?: boolean;
}

interface Props {
  step?: 'review' | 'success';
  org?: OrgBrand | null;
  signers?: SigningHeaderSigner[];
  completedSignatures?: number;
  totalSignatures?: number;
}

export function SigningHeader({
  step,
  org,
  signers = [],
  completedSignatures = 0,
  totalSignatures = 1,
}: Props) {
  const [showList, setShowList] = useState(false);
  const completed = completedSignatures ?? 0;
  const total = totalSignatures || 1;
  const list = signers.length
    ? signers
    : [{ name: 'Signatário', email: '', status: 'pending' as const, me: true }];

  return (
    <div className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        {org?.useOrgLogo && org.logoUrl ? (
          <div className="flex items-center gap-2">
            <img src={org.logoUrl} alt={org.name} className="h-9 w-auto max-w-[120px] object-contain" />
          </div>
        ) : (
          <PropezLogo height="sm" />
        )}
        {step !== 'review' && step !== 'success' && (
          <span className="text-xs text-gray-400 hidden sm:inline">Assinatura digital PropEZ</span>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowList(!showList)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
            showList ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${completed === total ? 'bg-green-500' : 'bg-yellow-400'}`} />
          <span>Assinaturas {completed}/{total}</span>
          <ChevronDown size={14} className={`transition-transform ${showList ? 'rotate-180' : ''}`} />
        </button>

        {showList && (
          <>
            <button type="button" className="fixed inset-0 z-40" onClick={() => setShowList(false)} aria-label="Fechar" />
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden ring-1 ring-black/5">
              <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Progresso do documento</h3>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {list.map((signer, idx) => {
                  const isCompleted = signer.status === 'completed';
                  const Icon = isCompleted ? Check : Clock;
                  return (
                    <div key={idx} className="flex items-start gap-3 p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        <Icon size={14} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">
                          {signer.name || 'Signatário'} {signer.me && <span className="font-normal text-gray-500">(Você)</span>}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{signer.email || '—'}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${isCompleted ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {isCompleted ? 'Assinado' : 'Aguardando'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

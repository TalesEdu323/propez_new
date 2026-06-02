import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SigningHeader, type SigningHeaderSigner } from './SigningHeader';
import type { OrgBrand } from './signTypes';

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  backAction?: () => void;
  org?: OrgBrand | null;
  signers?: SigningHeaderSigner[];
  completedSignatures?: number;
  totalSignatures?: number;
}

export function SignWizardWrapper({
  title,
  subtitle,
  children,
  backAction,
  org,
  signers,
  completedSignatures,
  totalSignatures,
}: Props) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      <SigningHeader org={org} signers={signers} completedSignatures={completedSignatures} totalSignatures={totalSignatures} />
      <div className="flex-1 flex flex-col items-center pt-8 px-4 pb-20">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">{subtitle}</p>
        </div>
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {children}
        </div>
        {backAction && (
          <button
            type="button"
            onClick={backAction}
            className="mt-6 flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium text-sm transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        )}
      </div>
      <p className="text-center text-xs text-gray-400 pb-6">Assinatura digital PropEZ</p>
    </div>
  );
}

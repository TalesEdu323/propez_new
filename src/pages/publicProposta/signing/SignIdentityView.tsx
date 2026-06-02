import { useState } from 'react';
import { ArrowRight, Loader2, Mail, User } from 'lucide-react';
import { SignWizardWrapper } from './SignWizardWrapper';
import type { OrgBrand, SignMeta } from './signTypes';

interface Props {
  meta: SignMeta;
  org?: OrgBrand | null;
  onBack: () => void;
  onSubmit: (data: { name: string; cpf?: string }) => Promise<void>;
}

export function SignIdentityView({ meta, org, onBack, onSubmit }: Props) {
  const [name, setName] = useState(meta.signerName || '');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Informe seu nome completo');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), cpf: cpf.trim() || undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao confirmar identidade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignWizardWrapper
      title="Confirme sua identidade"
      subtitle="Precisamos validar seus dados para garantir a validade jurídica da assinatura."
      backAction={onBack}
      org={org}
    >
      <div className="p-8 space-y-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase mb-2">E-mail *</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={20} />
            <input
              id="email"
              type="email"
              value={meta.signerEmail}
              readOnly
              disabled
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-gray-900 font-medium opacity-70"
            />
          </div>
          <p className="text-xs text-blue-600 mt-1">Email vinculado ao link de assinatura</p>
        </div>
        <div>
          <label htmlFor="name" className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome completo *</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 text-gray-400" size={20} />
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-gray-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
            />
          </div>
        </div>
        <div>
          <label htmlFor="cpf" className="block text-xs font-bold text-gray-500 uppercase mb-2">CPF (opcional)</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 text-gray-400" size={20} />
            <input
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="000.000.000-00"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-gray-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
            />
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <h4 className="font-semibold text-blue-800 mb-2 text-sm">Como funciona</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Confirme seus dados e avance para os passos de assinatura</li>
            <li>• CPF é opcional neste link</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="w-full bg-[#1877F2] hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirmar e Avançar <ArrowRight size={20} /></>}
        </button>
      </div>
    </SignWizardWrapper>
  );
}

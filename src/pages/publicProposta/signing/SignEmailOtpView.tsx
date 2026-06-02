import { useEffect, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { SignWizardWrapper } from './SignWizardWrapper';
import type { OrgBrand } from './signTypes';

interface Props {
  signerEmail: string;
  org?: OrgBrand | null;
  onBack: () => void;
  onRequestOtp: () => Promise<void>;
  onVerifyOtp: (code: string) => Promise<void>;
}

export function SignEmailOtpView({ signerEmail, org, onBack, onRequestOtp, onVerifyOtp }: Props) {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!requested) {
      setRequested(true);
      void (async () => {
        setLoading(true);
        try {
          await onRequestOtp();
          setStep('verify');
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Erro ao enviar código');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [requested, onRequestOtp]);

  const resend = async () => {
    setLoading(true);
    setError(null);
    try {
      await onRequestOtp();
      setStep('verify');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao reenviar');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (code.replace(/\D/g, '').length < 6) {
      setError('Informe o código de 6 dígitos');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onVerifyOtp(code.replace(/\D/g, ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignWizardWrapper
      title="Código por e-mail"
      subtitle="Validação de segurança via código enviado ao seu e-mail."
      backAction={onBack}
      org={org}
    >
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <Mail className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800">
            Código enviado para <strong>{signerEmail}</strong>
          </p>
        </div>

        {step === 'verify' && (
          <div className="space-y-3">
            <label htmlFor="otp" className="block text-xs font-bold text-gray-500 uppercase">Código de verificação</label>
            <input
              id="otp"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-center text-2xl font-bold tracking-[0.3em] text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={verify}
          disabled={loading || step !== 'verify'}
          className="w-full bg-[#1877F2] hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar código'}
        </button>

        <button type="button" onClick={resend} disabled={loading} className="w-full text-sm text-blue-600 hover:underline disabled:opacity-50">
          Reenviar código
        </button>
      </div>
    </SignWizardWrapper>
  );
}

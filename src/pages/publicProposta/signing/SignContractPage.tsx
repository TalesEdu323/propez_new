import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Loader2, XCircle } from 'lucide-react';
import { parseProposalFlow } from '../../../types/proposalFlow';
import { SignAuthSelectView } from './SignAuthSelectView';
import { SignDocumentReviewStep } from './SignDocumentReviewStep';
import { SignEmailOtpView } from './SignEmailOtpView';
import { SignIdentityView } from './SignIdentityView';
import { SignJourneyCompleteView } from './SignJourneyCompleteView';
import { SignPayView } from './SignPayView';
import { SignScreenSignatureView } from './SignScreenSignatureView';
import type {
  JourneyMethodId,
  JourneyMethodsResponse,
  OrgBrand,
  SignMeta,
  SignStep,
} from './signTypes';

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Erro na requisição');
  return data as T;
}

function resolveInitialStep(meta: SignMeta): SignStep {
  if (meta.used) return 'complete';
  if (meta.identityValidated) return 'auth_select';
  return 'document';
}

export default function SignContractPage() {
  const { publicToken: routePublicToken, signToken } = useParams<{ publicToken?: string; signToken: string }>();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<SignMeta | null>(null);
  const [org, setOrg] = useState<OrgBrand | null>(null);
  const [step, setStep] = useState<SignStep>('document');
  const [journey, setJourney] = useState<JourneyMethodsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = signToken ?? '';
  const publicToken = routePublicToken ?? meta?.publicToken ?? null;

  const orgBrand: OrgBrand | null = useMemo(() => org, [org]);

  const loadJourney = useCallback(async () => {
    const data = await apiJson<JourneyMethodsResponse>(
      `/api/public/sign/${encodeURIComponent(token)}/journey-methods`,
    );
    setJourney(data);
    return data;
  }, [token]);

  const loadMeta = useCallback(async () => {
    const data = await apiJson<SignMeta>(`/api/public/sign/${encodeURIComponent(token)}`);
    setMeta(data);
    if (data.used) {
      setStep('complete');
    } else {
      setStep(resolveInitialStep(data));
    }
    if (data.identityValidated) {
      await loadJourney();
    }
    return data;
  }, [token, loadJourney]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await loadMeta();
        const pt = routePublicToken ?? data.publicToken;
        if (pt) {
          try {
            const res = await fetch(`/api/public/propostas/${encodeURIComponent(pt)}`);
            if (res.ok) {
              const payload = await res.json();
              setOrg({
                name: payload.organization?.name ?? 'Organização',
                logoUrl: payload.organization?.logoUrl,
                primaryColor: payload.organization?.primaryColor,
                useOrgLogo: Boolean(payload.organization?.whitelabelEnabled),
              });
            }
          } catch {
            /* optional org */
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, routePublicToken, loadMeta]);

  const refreshAfterMethod = async () => {
    await loadJourney();
    setStep('auth_select');
  };

  const handleIdentity = async (data: { name: string; cpf?: string }) => {
    await apiJson(`/api/public/sign/${encodeURIComponent(token)}/auth/identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setMeta((m) => (m ? { ...m, identityValidated: true, signerName: data.name } : m));
    await loadJourney();
    setStep('auth_select');
  };

  const handleScreenSignature = async (signatureImage: string) => {
    await apiJson(`/api/public/sign/${encodeURIComponent(token)}/auth/signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signatureImage }),
    });
    await refreshAfterMethod();
  };

  const handleRequestOtp = async () => {
    await apiJson(`/api/public/sign/${encodeURIComponent(token)}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  };

  const handleVerifyOtp = async (code: string) => {
    await apiJson(`/api/public/sign/${encodeURIComponent(token)}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    await refreshAfterMethod();
  };

  const handlePaymentComplete = async () => {
    await apiJson(`/api/public/sign/${encodeURIComponent(token)}/auth/payment/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    await refreshAfterMethod();
  };

  const handleSelectMethod = (id: JourneyMethodId) => {
    if (id === 'SIGNATURE_ON_SCREEN') setStep('screen_signature');
    else if (id === 'EMAIL_OTP') setStep('email_otp');
    else if (id === 'PAYMENT') setStep('payment');
  };

  const handleFinalComplete = async () => {
    setCompleting(true);
    setCompleteError(null);
    try {
      await apiJson(`/api/public/sign/${encodeURIComponent(token)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      setMeta((m) => (m ? { ...m, used: true } : m));
      setStep('complete');
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : 'Erro ao finalizar');
    } finally {
      setCompleting(false);
    }
  };

  const backToProposal = () => {
    if (publicToken) navigate(`/p/${publicToken}?done=1`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-600">Carregando documento...</p>
        </div>
      </div>
    );
  }

  if (error && !meta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <XCircle className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Erro</h2>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!meta) return null;

  if (step === 'complete' || meta.used) {
    return (
      <SignJourneyCompleteView
        meta={{ ...meta, fluxo: meta.fluxo ?? journey?.fluxo ?? parseProposalFlow(undefined) }}
        org={orgBrand}
        publicToken={publicToken}
        onBackToProposal={publicToken ? backToProposal : undefined}
      />
    );
  }

  if (step === 'document') {
    return (
      <SignDocumentReviewStep
        meta={meta}
        org={orgBrand}
        onContinue={async () => {
          if (meta.identityValidated) {
            if (!journey) await loadJourney();
            setStep('auth_select');
          } else {
            setStep('identity');
          }
        }}
      />
    );
  }

  if (step === 'identity') {
    return (
      <SignIdentityView
        meta={meta}
        org={orgBrand}
        onBack={() => setStep('document')}
        onSubmit={handleIdentity}
      />
    );
  }

  if (step === 'auth_select' && journey) {
    return (
      <SignAuthSelectView
        methods={journey.methods}
        completedCount={journey.completedCount}
        totalSteps={journey.totalSteps}
        nextMethodId={journey.nextMethodId}
        allCompleted={journey.allCompleted}
        completing={completing}
        completeError={completeError}
        org={orgBrand}
        onSelectMethod={handleSelectMethod}
        onComplete={handleFinalComplete}
        onBack={() => setStep('identity')}
      />
    );
  }

  if (step === 'screen_signature') {
    return (
      <SignScreenSignatureView
        org={orgBrand}
        signerName={meta.signerName}
        onBack={() => setStep('auth_select')}
        onSubmit={handleScreenSignature}
      />
    );
  }

  if (step === 'email_otp') {
    return (
      <SignEmailOtpView
        signerEmail={meta.signerEmail}
        org={orgBrand}
        onBack={() => setStep('auth_select')}
        onRequestOtp={handleRequestOtp}
        onVerifyOtp={handleVerifyOtp}
      />
    );
  }

  if (step === 'payment' && journey?.payment) {
    return (
      <SignPayView
        valorCents={journey.payment.valorCents}
        chavePix={journey.payment.chavePix}
        linkPagamento={journey.payment.linkPagamento}
        whatsappComprovante={journey.payment.whatsappComprovante}
        proposalTitle={meta?.title}
        org={orgBrand}
        onBack={() => setStep('auth_select')}
        onComplete={handlePaymentComplete}
      />
    );
  }

  if (step === 'auth_select' && !journey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6">
      <div className="text-center">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <p className="text-gray-600">Não foi possível carregar esta etapa.</p>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, FileCheck, AlertCircle } from 'lucide-react';
import { PublicOrgHeader } from '../PublicOrgHeader';
import { SignatureCanvas } from './SignatureCanvas';

interface SignMeta {
  documentId: string;
  title: string;
  signerName: string;
  signerEmail: string;
  used: boolean;
  expiresAt: string;
  previewUrl: string;
}

interface OrgInfo {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
}

export default function SignContractPage() {
  const { publicToken, signToken } = useParams<{ publicToken: string; signToken: string }>();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<SignMeta | null>(null);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!signToken) return;
    (async () => {
      try {
        const res = await fetch(`/api/public/sign/${encodeURIComponent(signToken)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Link inválido');
        setMeta(data);
        if (data.used) setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar');
      } finally {
        setLoading(false);
      }
    })();
  }, [signToken]);

  useEffect(() => {
    if (!publicToken) return;
    (async () => {
      try {
        const res = await fetch(`/api/public/propostas/${encodeURIComponent(publicToken)}`);
        if (!res.ok) return;
        const data = await res.json();
        setOrg({ name: data.organization?.name ?? 'Organização', logoUrl: data.organization?.logoUrl, primaryColor: data.organization?.primaryColor });
      } catch {
        /* optional */
      }
    })();
  }, [publicToken]);

  const submit = async () => {
    if (!signToken || !signature) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/sign/${encodeURIComponent(signToken)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureImage: signature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao registrar assinatura');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao assinar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error && !meta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-zinc-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {org && <PublicOrgHeader orgName={org.name} logoUrl={org.logoUrl} primaryColor={org.primaryColor} />}
      <div className="max-w-2xl mx-auto px-4 py-10">
        {done ? (
          <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-8 text-center">
            <FileCheck className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-emerald-900">Assinatura registrada</h1>
            <p className="text-emerald-800 text-sm mt-2 mb-6">Contrato assinado digitalmente na PropEZ</p>
            {publicToken && (
              <button type="button" className="btn-primary" onClick={() => navigate(`/p/${publicToken}?signed=1`)}>
                Voltar à proposta
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-3xl bg-white border border-black/5 shadow-lg p-8">
            <h1 className="text-xl font-bold text-zinc-900 mb-1">Assinar contrato</h1>
            <p className="text-sm text-zinc-500 mb-2">{meta?.title}</p>
            <p className="text-xs text-zinc-400 mb-6">
              Assinatura digital PropEZ · {meta?.signerEmail}
            </p>
            {meta?.previewUrl && (
              <iframe
                title="Contrato"
                src={meta.previewUrl}
                className="w-full h-72 rounded-xl border border-zinc-200 mb-6"
              />
            )}
            <SignatureCanvas onChange={setSignature} disabled={submitting} />
            {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
            <button type="button" className="btn-primary w-full mt-6" disabled={!signature || submitting} onClick={submit}>
              {submitting ? 'Registrando…' : 'Confirmar assinatura'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

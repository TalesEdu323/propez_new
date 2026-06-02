import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Check, ShieldCheck, Loader2 } from 'lucide-react';

interface ValidityPayload {
  document: { id: string; title: string; status: string };
  signatures: Array<{ signerName: string; signerEmail: string; used: boolean; usedAt: string | null }>;
  security: { documentHash: string };
  validationCode: string;
  verificationUrl: string;
}

export default function ValidityPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [data, setData] = useState<ValidityPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    const token = new URLSearchParams(window.location.search).get('token') ?? '';
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    fetch(`/api/public/validity/${encodeURIComponent(documentId)}${qs}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro');
        setData(json);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro'));
  }, [documentId]);

  const copyHash = async () => {
    if (!data?.security.documentHash) return;
    await navigator.clipboard.writeText(data.security.documentHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-black/5 shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-xl font-bold">Validade jurídica</h1>
            <p className="text-xs text-zinc-500">PropEZ · Assinado com Rubrica · Powered by Taggo</p>
          </div>
        </div>
        <p className="font-semibold text-zinc-900">{data.document.title}</p>
        <p className="text-sm text-zinc-500 mt-1">Código: {data.validationCode}</p>
        <p className="text-sm text-zinc-500">Status: {data.document.status}</p>
        <div className="mt-4 flex items-center gap-2">
          <code className="text-xs bg-zinc-100 px-2 py-1 rounded flex-1 truncate">{data.security.documentHash}</code>
          <button type="button" onClick={copyHash} className="p-2 rounded-lg hover:bg-zinc-100">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <h2 className="font-semibold mt-8 mb-3">Signatários</h2>
        <ul className="space-y-2">
          {data.signatures.map((s) => (
            <li key={s.signerEmail} className="text-sm border border-zinc-100 rounded-xl p-3">
              <strong>{s.signerName}</strong> — {s.used ? 'Assinado' : 'Pendente'}
            </li>
          ))}
        </ul>
        <a href={data.verificationUrl} className="text-sm text-orange-600 mt-6 inline-block">
          {data.verificationUrl}
        </a>
      </div>
    </div>
  );
}

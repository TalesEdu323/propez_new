import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Loader2, PenTool, Type, Upload } from 'lucide-react';
import { SignatureCanvas } from './SignatureCanvas';
import { SignWizardWrapper } from './SignWizardWrapper';
import type { OrgBrand } from './signTypes';

type SignatureTab = 'draw' | 'type' | 'upload';
type FontChoice = 'aletheia' | 'authentic';

interface Props {
  org?: OrgBrand | null;
  signerName?: string;
  onBack: () => void;
  onSubmit: (signatureImage: string) => Promise<void>;
}

function getSignatureFontFamily(choice: FontChoice): string {
  return choice === 'aletheia'
    ? '"Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive'
    : '"Segoe Script", "Snell Roundhand", "Apple Chancery", cursive';
}

export function SignScreenSignatureView({ org, signerName = '', onBack, onSubmit }: Props) {
  const [tab, setTab] = useState<SignatureTab>('draw');
  const [drawSignature, setDrawSignature] = useState<string | null>(null);
  const [typedSignature, setTypedSignature] = useState(signerName);
  const [typedImage, setTypedImage] = useState<string | null>(null);
  const [fontChoice, setFontChoice] = useState<FontChoice>('aletheia');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousTabRef = useRef<SignatureTab>('draw');

  useEffect(() => {
    if (signerName && !typedSignature) setTypedSignature(signerName);
  }, [signerName, typedSignature]);

  const generateTypeImage = useCallback(
    async (text: string): Promise<string | null> => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      const fontFamily = getSignatureFontFamily(fontChoice);
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1e3a8a';
      ctx.font = `48px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(trimmed, canvas.width / 2, canvas.height / 2);
      return canvas.toDataURL('image/png');
    },
    [fontChoice],
  );

  useEffect(() => {
    if (tab !== 'type') return;
    if (!typedSignature.trim()) {
      setTypedImage(null);
      return;
    }
    let cancelled = false;
    void generateTypeImage(typedSignature).then((url) => {
      if (!cancelled) setTypedImage(url);
    });
    return () => {
      cancelled = true;
    };
  }, [tab, typedSignature, fontChoice, generateTypeImage]);

  const selectTab = (next: SignatureTab) => {
    if (previousTabRef.current === 'draw' && next !== 'draw') {
      setDrawSignature(null);
    }
    if (next !== 'upload') {
      setUploadPreview(null);
    }
    previousTabRef.current = next;
    setTab(next);
    setError(null);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result?.startsWith('data:image')) {
        setUploadPreview(result);
      } else {
        setError('Envie uma imagem JPG ou PNG.');
        setUploadPreview(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const resolveSignature = async (): Promise<string | null> => {
    if (tab === 'draw') return drawSignature;
    if (tab === 'type') return typedImage ?? (await generateTypeImage(typedSignature));
    if (tab === 'upload') return uploadPreview;
    return null;
  };

  const hasValidSignature = (): boolean => {
    if (tab === 'draw') return Boolean(drawSignature);
    if (tab === 'type') return Boolean(typedSignature.trim());
    if (tab === 'upload') return Boolean(uploadPreview);
    return false;
  };

  const handleSubmit = async () => {
    const image = await resolveSignature();
    if (!image) {
      setError(
        tab === 'draw'
          ? 'Desenhe sua assinatura antes de continuar.'
          : tab === 'type'
            ? 'Digite seu nome antes de continuar.'
            : 'Envie uma imagem da sua assinatura antes de continuar.',
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(image);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar assinatura');
    } finally {
      setSubmitting(false);
    }
  };

  const tabBtn = (id: SignatureTab, label: string, Icon: typeof PenTool) => (
    <button
      type="button"
      onClick={() => selectTab(id)}
      className={`flex-1 py-4 text-sm font-bold text-center transition-colors flex items-center justify-center gap-2 relative ${
        tab === id ? 'text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      <Icon size={16} />
      {label}
      {tab === id && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />}
    </button>
  );

  return (
    <SignWizardWrapper
      title="Crie sua assinatura"
      subtitle="Como você gostaria de assinar este documento?"
      backAction={onBack}
      org={org}
    >
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm mx-4 sm:mx-8 mb-4">
        <div className="flex border-b border-gray-200 bg-white">
          {tabBtn('draw', 'Desenhar', PenTool)}
          {tabBtn('type', 'Digitar', Type)}
          {tabBtn('upload', 'Upload', Upload)}
        </div>

        <div className="p-6 sm:p-8 min-h-[280px] flex flex-col justify-center bg-gray-50">
          {tab === 'draw' && (
            <SignatureCanvas onChange={setDrawSignature} disabled={submitting} height={192} />
          )}

          {tab === 'type' && (
            <div className="space-y-6 text-center">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase">Estilo da fonte:</span>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setFontChoice('aletheia')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      fontChoice === 'aletheia' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Manuscrito
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontChoice('authentic')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      fontChoice === 'authentic' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Script
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Seu nome completo</label>
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="w-full border-b-2 border-gray-300 bg-white text-center text-base py-2.5 focus:border-blue-600 outline-none transition-colors rounded px-2 text-gray-900 font-medium"
                  placeholder="Digite seu nome"
                />
              </div>
              <div className="h-32 flex items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm px-4">
                <p
                  className="text-4xl sm:text-5xl text-[#1e3a8a] px-4 truncate max-w-full"
                  style={{ fontFamily: getSignatureFontFamily(fontChoice) }}
                >
                  {typedSignature.trim() || 'Sua Assinatura'}
                </p>
              </div>
            </div>
          )}

          {tab === 'upload' && (
            <div className="h-48 border-2 border-dashed border-gray-300 rounded-xl bg-white flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group relative">
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {!uploadPreview ? (
                <>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <Upload size={32} />
                  </div>
                  <span className="text-sm font-bold text-gray-700">Clique para enviar imagem</span>
                  <span className="text-xs mt-1">JPG ou PNG</span>
                </>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center p-4">
                  <img src={uploadPreview} alt="Preview assinatura" className="max-h-full max-w-full object-contain" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors z-20"
                  >
                    <Eraser size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-8 pb-8 space-y-4">
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!hasValidSignature() || submitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar assinatura'}
        </button>
      </div>
    </SignWizardWrapper>
  );
}

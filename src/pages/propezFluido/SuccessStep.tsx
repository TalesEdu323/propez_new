import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Eye, Mail, MessageCircle, AlertCircle } from 'lucide-react';
import { generatePublicLink, sendProposalEmail } from '../../lib/store';
import { ApiError } from '../../lib/apiClient';
import { PropezLogo } from '../../components/PropezLogo';
import { buildProposalWhatsAppMessage, buildWhatsAppUrl } from '../../lib/whatsappShare';

export interface SuccessStepProps {
  propostaId: string;
  clienteEmail: string;
  onEmailChange: (email: string) => void;
  onNavigateToPropostas: () => void;
  onNavigateToView: () => void;
}

type EmailSendStatus = 'idle' | 'sending' | 'sent' | 'failed' | 'skipped';

function isValidEmail(email: string): boolean {
  const t = email.trim();
  return t.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export function SuccessStep({
  propostaId,
  clienteEmail,
  onEmailChange,
  onNavigateToPropostas,
  onNavigateToView,
}: SuccessStepProps) {
  const [isSendingManual, setIsSendingManual] = useState(false);
  const [proposalUrl, setProposalUrl] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailSendStatus>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const emailSentRef = useRef(false);
  const autoSendTriggeredRef = useRef(false);

  const trySendEmail = useCallback(
    async (email: string, manual = false): Promise<boolean> => {
      if (!isValidEmail(email)) {
        if (manual) setEmailError('Informe um e-mail válido.');
        return false;
      }
      setEmailError(null);
      setEmailStatus('sending');
      if (manual) setIsSendingManual(true);
      try {
        const result = await sendProposalEmail(propostaId, email.trim());
        if (!result.sent) {
          setEmailStatus('failed');
          setEmailError(
            'Não foi possível enviar o e-mail. Verifique a configuração ou tente novamente.',
          );
          return false;
        }
        setEmailStatus('sent');
        setSentTo(result.to ?? email.trim());
        return true;
      } catch (error) {
        console.error('[SuccessStep] erro ao enviar e-mail:', error);
        setEmailStatus('failed');
        if (error instanceof ApiError) {
          const body = error.body as { error?: string } | undefined;
          if (error.status === 503) {
            setEmailError(body?.error ?? 'Serviço de e-mail não configurado.');
          } else {
            setEmailError(body?.error ?? 'Erro ao enviar o e-mail.');
          }
        } else {
          setEmailError('Erro de conexão ao tentar enviar o e-mail.');
        }
        return false;
      } finally {
        if (manual) setIsSendingManual(false);
      }
    },
    [propostaId],
  );

  const runAutoSend = useCallback(
    async (_url: string, email: string) => {
      if (autoSendTriggeredRef.current || emailSentRef.current) return;
      autoSendTriggeredRef.current = true;

      if (!isValidEmail(email)) {
        setEmailStatus('skipped');
        return;
      }

      emailSentRef.current = true;
      await trySendEmail(email, false);
    },
    [trySendEmail],
  );

  const loadPublicLink = async (cancelledRef?: { current: boolean }) => {
    setIsGeneratingLink(true);
    setLinkError(null);
    try {
      const result = await generatePublicLink(propostaId);
      if (cancelledRef?.current) return;
      setProposalUrl(result.url);
      void runAutoSend(result.url, clienteEmail);
    } catch (error) {
      console.error('[SuccessStep] erro ao gerar link publico:', error);
      if (cancelledRef?.current) return;
      if (error instanceof ApiError && error.status === 404) {
        setLinkError(
          'A proposta ainda não foi persistida. Salve novamente antes de compartilhar o link.',
        );
      } else {
        setLinkError(
          'Não foi possível gerar o link público agora. Tente novamente em alguns instantes.',
        );
      }
    } finally {
      if (!cancelledRef?.current) setIsGeneratingLink(false);
    }
  };

  useEffect(() => {
    const cancelledRef = { current: false };
    emailSentRef.current = false;
    autoSendTriggeredRef.current = false;
    setEmailStatus('idle');
    setEmailError(null);
    setSentTo(null);

    void loadPublicLink(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [propostaId]);

  const handleResendEmail = async () => {
    emailSentRef.current = false;
    const ok = await trySendEmail(clienteEmail, true);
    if (ok) emailSentRef.current = true;
  };

  const handleCopyLink = () => {
    if (!proposalUrl) return;
    void navigator.clipboard.writeText(proposalUrl);
    setCopyFeedback(true);
    window.setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!proposalUrl) return;
    const message = buildProposalWhatsAppMessage(proposalUrl);
    const url = buildWhatsAppUrl(whatsappPhone, message);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const whatsappDisabled = isGeneratingLink || !proposalUrl || !whatsappPhone.trim();

  return (
    <div className="min-h-screen bg-[#f5f5f4] flex flex-col items-center justify-center py-8 px-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl border border-black/5 overflow-hidden"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[min(640px,85vh)]">
          {/* Coluna esquerda — marca */}
          <div className="flex flex-col justify-center p-8 md:p-12 bg-zinc-50/80 border-b md:border-b-0 md:border-r border-black/5">
            <PropezLogo height="lg" className="mb-10" />
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900 tracking-tight">
                  Proposta gerada
                </h2>
                <p className="text-zinc-500 mt-2 text-sm leading-relaxed">
                  O link público está pronto. O e-mail do cliente é enviado automaticamente quando
                  informado no passo anterior.
                </p>
              </div>
            </div>
            {clienteEmail.trim() && (
              <p className="text-xs text-zinc-400 mt-6">
                Destinatário:{' '}
                <span className="font-medium text-zinc-600">{clienteEmail.trim()}</span>
              </p>
            )}
            <div className="mt-auto pt-10 flex flex-wrap gap-4 text-sm">
              <button
                type="button"
                onClick={onNavigateToView}
                className="font-medium text-zinc-900 hover:text-blue-600 transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" /> Visualizar proposta
              </button>
              <button
                type="button"
                onClick={onNavigateToPropostas}
                className="font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Ir para o dashboard
              </button>
            </div>
          </div>

          {/* Coluna direita — compartilhamento */}
          <div className="p-8 md:p-12 space-y-8 flex flex-col">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-widest">
                Link de acesso
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  readOnly
                  value={
                    isGeneratingLink
                      ? 'Gerando link público...'
                      : linkError
                        ? linkError
                        : proposalUrl
                  }
                  className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-3.5 text-sm font-mono text-zinc-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={isGeneratingLink || !proposalUrl}
                  className="bg-[#0a0a0a] text-white hover:bg-zinc-800 rounded-xl px-6 py-3.5 text-sm font-medium transition-all active:scale-[0.98] whitespace-nowrap disabled:opacity-50"
                >
                  {copyFeedback ? 'Copiado!' : isGeneratingLink ? 'Gerando...' : 'Copiar link'}
                </button>
              </div>
              {linkError && (
                <button
                  type="button"
                  onClick={() => void loadPublicLink()}
                  disabled={isGeneratingLink}
                  className="mt-3 text-xs font-semibold text-zinc-700 hover:text-zinc-900 underline disabled:opacity-60"
                >
                  Tentar gerar link novamente
                </button>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-widest">
                E-mail do cliente
              </label>
              {emailStatus === 'sent' && sentTo && (
                <div className="mb-3 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Proposta enviada automaticamente para <strong>{sentTo}</strong>
                  </span>
                </div>
              )}
              {emailStatus === 'skipped' && (
                <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-900">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Informe o e-mail abaixo e use &quot;Reenviar e-mail&quot; para enviar a proposta.
                  </span>
                </div>
              )}
              {emailStatus === 'failed' && emailError && (
                <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-900">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{emailError}</span>
                </div>
              )}
              {emailStatus === 'sending' && (
                <p className="mb-3 text-sm text-zinc-500 flex items-center gap-2">
                  <Mail className="w-4 h-4 animate-pulse" />
                  Enviando e-mail...
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={clienteEmail}
                  onChange={e => onEmailChange(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
                <button
                  type="button"
                  onClick={() => void handleResendEmail()}
                  disabled={isSendingManual || emailStatus === 'sending' || !clienteEmail.trim()}
                  className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl px-6 py-3.5 text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  <Mail className="w-4 h-4" />
                  {isSendingManual || emailStatus === 'sending' ? 'Enviando...' : 'Reenviar e-mail'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-widest">
                WhatsApp do cliente
              </label>
              <p className="text-xs text-zinc-500 mb-3">
                Informe o número com DDD. Abriremos o WhatsApp com o link da proposta na mensagem.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={e => setWhatsappPhone(e.target.value)}
                  placeholder="5511999999999"
                  className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  disabled={whatsappDisabled}
                  className="bg-[#25D366] text-white hover:bg-[#20bd5a] rounded-xl px-6 py-3.5 text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar no WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

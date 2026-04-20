import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Eye, Mail } from 'lucide-react';

export interface SuccessStepProps {
  propostaId: string;
  clienteEmail: string;
  onEmailChange: (email: string) => void;
  onNavigateToPropostas: () => void;
  onNavigateToView: () => void;
}

export function SuccessStep({
  propostaId,
  clienteEmail,
  onEmailChange,
  onNavigateToPropostas,
  onNavigateToView,
}: SuccessStepProps) {
  const [isSending, setIsSending] = useState(false);

  const proposalUrl = `${window.location.origin}/?route=visualizar-proposta&id=${propostaId}`;

  const handleSendEmail = async () => {
    if (!clienteEmail) {
      alert('Preencha o e-mail do cliente.');
      return;
    }
    setIsSending(true);
    try {
      // Simulação do envio: no futuro substituir por chamada real.
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`Proposta enviada com sucesso para ${clienteEmail}! (Simulação)`);
      onNavigateToPropostas();
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro de conexão ao tentar enviar o e-mail.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(proposalUrl);
    alert('Link copiado!');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f4] flex flex-col items-center justify-center py-8 px-[7px] font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-black/5"
      >
        <div className="bg-[#0a0a0a] p-6 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_0%,#ffffff_0%,transparent_70%)]" />
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white/10 text-white rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-semibold text-white mb-4 tracking-tight">Proposta Gerada!</h2>
            <p className="text-white/70 text-lg max-w-md mx-auto">
              Sua proposta foi compilada com sucesso e o link de acesso já está disponível.
            </p>
          </div>
        </div>

        <div className="p-6 md:p-12 space-y-10">
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Link de Acesso Exclusivo</label>
            <div className="flex gap-3">
              <input
                type="text"
                readOnly
                value={proposalUrl}
                className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm font-mono text-zinc-600 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="bg-[#0a0a0a] text-white hover:bg-zinc-800 rounded-xl px-8 py-4 text-sm font-medium transition-all active:scale-[0.98] whitespace-nowrap"
              >
                Copiar Link
              </button>
            </div>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Envio Direto</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">E-mail do Cliente</label>
            <div className="flex gap-3">
              <input
                type="email"
                value={clienteEmail}
                onChange={e => onEmailChange(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
              />
              <button
                onClick={handleSendEmail}
                disabled={isSending}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl px-8 py-4 text-sm font-medium transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                <Mail className="w-4 h-4" />
                {isSending ? 'Enviando...' : 'Enviar Agora'}
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-black/5 flex justify-between items-center">
            <button
              onClick={onNavigateToView}
              className="text-sm font-medium text-zinc-900 hover:text-blue-600 transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" /> Visualizar Proposta
            </button>
            <button
              onClick={onNavigateToPropostas}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Ir para o Dashboard
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

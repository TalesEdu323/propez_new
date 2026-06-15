import { AnimatePresence, motion } from 'motion/react';
import { Users } from 'lucide-react';

export interface ClientIdentificationData {
  nome: string;
  email: string;
  documento: string;
}

export interface ClientIdentificationModalProps {
  open: boolean;
  value: ClientIdentificationData;
  onChange: (value: ClientIdentificationData) => void;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export function ClientIdentificationModal({
  open,
  value,
  onChange,
  onConfirm,
  onClose,
  isSubmitting = false,
}: ClientIdentificationModalProps) {
  const update = (patch: Partial<ClientIdentificationData>) => onChange({ ...value, ...patch });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.99, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/10 border border-black/[0.05] flex flex-col max-h-[92dvh] overflow-hidden"
          >
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 sm:p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-black/[0.03]">
                  <Users className="w-8 h-8 text-zinc-900" />
                </div>
                <h3 className="text-2xl font-semibold text-zinc-900 tracking-tight">Identificação</h3>
                <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                  Para prosseguir com a assinatura, precisamos de alguns dados adicionais para o contrato.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">Nome completo</label>
                  <input
                    type="text"
                    value={value.nome}
                    onChange={e => update({ nome: e.target.value })}
                    className="glass-input"
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">E-mail</label>
                  <input
                    type="email"
                    value={value.email}
                    onChange={e => update({ email: e.target.value })}
                    className="glass-input"
                    placeholder="exemplo@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">CPF ou CNPJ</label>
                  <input
                    type="text"
                    value={value.documento}
                    onChange={e => update({ documento: e.target.value })}
                    className="glass-input"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
            </div>

            <div className="shrink-0 p-6 sm:p-8 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-zinc-100 flex flex-col gap-3">
              <button
                onClick={onConfirm}
                disabled={isSubmitting || !value.nome || !value.email || !value.documento}
                className="btn-primary w-full py-3.5 disabled:opacity-50"
              >
                {isSubmitting ? 'Processando...' : 'Confirmar e assinar'}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-zinc-500 text-sm font-medium hover:text-zinc-900 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

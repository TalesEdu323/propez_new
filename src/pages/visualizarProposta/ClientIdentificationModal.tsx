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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-black/[0.05]"
          >
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-black/[0.03]">
                <Users className="w-10 h-10 text-zinc-900" />
              </div>
              <h3 className="text-3xl font-bold text-zinc-900 tracking-tight">Identificação</h3>
              <p className="text-zinc-500 text-sm mt-3 font-medium leading-relaxed">
                Para prosseguir com a assinatura, precisamos de alguns dados adicionais para o contrato.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3 ml-1">Nome Completo</label>
                <input
                  type="text"
                  value={value.nome}
                  onChange={e => update({ nome: e.target.value })}
                  className="glass-input"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3 ml-1">E-mail</label>
                <input
                  type="email"
                  value={value.email}
                  onChange={e => update({ email: e.target.value })}
                  className="glass-input"
                  placeholder="exemplo@email.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3 ml-1">CPF ou CNPJ</label>
                <input
                  type="text"
                  value={value.documento}
                  onChange={e => update({ documento: e.target.value })}
                  className="glass-input"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="mt-12 flex flex-col gap-4">
              <button
                onClick={onConfirm}
                disabled={isSubmitting || !value.nome || !value.email || !value.documento}
                className="w-full h-14 bg-zinc-900 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
              >
                {isSubmitting ? 'Processando...' : 'Confirmar e Assinar'}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-zinc-900 transition-colors"
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

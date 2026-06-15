import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Cliente } from '../../lib/store';

export interface ClienteModalProps {
  open: boolean;
  value: Partial<Cliente>;
  onChange: (value: Partial<Cliente>) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}

export function ClienteModal({ open, value, onChange, onSubmit, onClose }: ClienteModalProps) {
  const update = (patch: Partial<Cliente>) => onChange({ ...value, ...patch });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-zinc-900/40 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="bg-white border border-black/[0.05] rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/10 w-full max-w-lg flex flex-col max-h-[92dvh] overflow-hidden"
          >
            <div className="shrink-0 p-6 sm:p-7 border-b border-zinc-100">
              <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">
                {value.id ? 'Editar cliente' : 'Novo cliente'}
              </h2>
              <p className="text-zinc-500 text-sm mt-1">Preencha as informações básicas do contato.</p>
            </div>
            <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 sm:p-7 grid grid-cols-1 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">Nome completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    value={value.nome || ''}
                    onChange={e => update({ nome: e.target.value })}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">Empresa</label>
                  <input
                    type="text"
                    placeholder="Ex: Apple Inc."
                    value={value.empresa || ''}
                    onChange={e => update({ empresa: e.target.value })}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">E-mail *</label>
                  <input
                    type="email"
                    required
                    placeholder="joao@exemplo.com"
                    value={value.email || ''}
                    onChange={e => update({ email: e.target.value })}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">Telefone</label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={value.telefone || ''}
                    onChange={e => update({ telefone: e.target.value })}
                    className="glass-input"
                  />
                </div>
              </div>

              <div className="shrink-0 p-6 sm:p-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-zinc-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar cliente
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

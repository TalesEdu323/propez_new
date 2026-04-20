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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white border border-black/[0.05] rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-10 md:p-14 border-b border-zinc-100">
              <h2 className="text-3xl font-semibold text-zinc-900 tracking-tightest">
                {value.id ? 'Editar Cliente.' : 'Novo Cliente.'}
              </h2>
              <p className="text-zinc-400 text-sm font-medium mt-3">Preencha as informações básicas do contato.</p>
            </div>
            <form onSubmit={onSubmit} className="p-10 md:p-14 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">Nome Completo *</label>
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
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">Empresa</label>
                  <input
                    type="text"
                    placeholder="Ex: Apple Inc."
                    value={value.empresa || ''}
                    onChange={e => update({ empresa: e.target.value })}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">E-mail *</label>
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
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">Telefone</label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={value.telefone || ''}
                    onChange={e => update({ telefone: e.target.value })}
                    className="glass-input"
                  />
                </div>
              </div>

              <div className="pt-10 flex items-center justify-end gap-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:text-zinc-900 transition-colors px-4"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar Cliente
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

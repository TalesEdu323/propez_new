import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2, Mail, Phone } from 'lucide-react';
import type { Cliente } from '../../lib/store';

export interface ClientesCardsProps {
  clientes: Cliente[];
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: string) => void;
}

export function ClientesCards({ clientes, onEdit, onDelete }: ClientesCardsProps) {
  return (
    <div className="md:hidden divide-y divide-zinc-100">
      <AnimatePresence>
        {clientes.map((cliente) => (
          <motion.div
            key={cliente.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 space-y-5"
          >
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <div className="font-bold text-zinc-900 text-lg tracking-tight leading-tight truncate">{cliente.nome}</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mt-1.5">
                  {cliente.empresa || 'Sem empresa'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(cliente)}
                  className="w-10 h-10 flex items-center justify-center text-zinc-400 bg-zinc-50 rounded-xl border border-zinc-100 active:scale-90 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(cliente.id)}
                  className="w-10 h-10 flex items-center justify-center text-red-500 bg-red-50 rounded-xl border border-red-100 active:scale-90 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-zinc-50/50 p-5 rounded-2xl border border-zinc-100 space-y-3">
              <div className="flex items-center gap-3 text-xs text-zinc-600 font-medium">
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center border border-zinc-100 shadow-sm">
                  <Mail className="w-3.5 h-3.5 text-zinc-300" />
                </div>
                <span className="truncate">{cliente.email}</span>
              </div>
              {cliente.telefone && (
                <div className="flex items-center gap-3 text-xs text-zinc-600 font-medium">
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center border border-zinc-100 shadow-sm">
                    <Phone className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                  <span>{cliente.telefone}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2, Mail, Phone } from 'lucide-react';
import type { Cliente } from '../../lib/store';

export interface ClientesTableProps {
  clientes: Cliente[];
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: string) => void;
}

export function ClientesTable({ clientes, onEdit, onDelete }: ClientesTableProps) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 border-b border-zinc-100">
            <th className="px-10 py-8 font-bold">Cliente</th>
            <th className="px-10 py-8 font-bold">Contato</th>
            <th className="px-10 py-8 font-bold">Status</th>
            <th className="px-10 py-8 font-bold">Cadastro</th>
            <th className="px-10 py-8 font-bold text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          <AnimatePresence>
            {clientes.map((cliente) => (
              <motion.tr
                key={cliente.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="hover:bg-zinc-50/50 transition-all group"
              >
                <td className="px-10 py-8">
                  <div className="font-bold text-zinc-900 text-lg tracking-tight">{cliente.nome}</div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.15em] mt-1.5">{cliente.empresa || 'Sem empresa'}</div>
                </td>
                <td className="px-10 py-8">
                  <div className="flex items-center gap-3 text-sm text-zinc-600 font-medium mb-2">
                    <Mail className="w-4 h-4 text-zinc-300" /> {cliente.email}
                  </div>
                  {cliente.telefone && (
                    <div className="flex items-center gap-3 text-sm text-zinc-600 font-medium">
                      <Phone className="w-4 h-4 text-zinc-300" /> {cliente.telefone}
                    </div>
                  )}
                </td>
                <td className="px-10 py-8">
                  <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                    Ativo
                  </span>
                </td>
                <td className="px-10 py-8">
                  <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                    {new Date(cliente.data_cadastro).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </td>
                <td className="px-10 py-8 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button
                      onClick={() => onEdit(cliente)}
                      className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-zinc-100"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(cliente.id)}
                      className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

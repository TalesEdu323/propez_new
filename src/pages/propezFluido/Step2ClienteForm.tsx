import React from 'react';
import { motion } from 'motion/react';
import { Layers } from 'lucide-react';
import type { Cliente } from '../../lib/store';
import type { PropezFluidoFormData, SetFormData } from './types';

export interface Step2Props {
  clientes: Cliente[];
  formData: PropezFluidoFormData;
  setFormData: SetFormData;
  onOpenLeadPicker: () => void;
}

export function Step2ClienteForm({ clientes, formData, setFormData, onOpenLeadPicker }: Step2Props) {
  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const client = clientes.find(c => c.id === id);
    if (client) {
      setFormData(prev => ({
        ...prev,
        clienteId: id,
        clienteNome: client.nome,
        clienteEmail: client.email,
        prosyncLeadId: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        clienteId: '',
        clienteNome: '',
        clienteEmail: '',
        prosyncLeadId: '',
      }));
    }
  };

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-12">
        <h2 className="text-4xl font-semibold text-zinc-900 mb-3 tracking-tight">Dados do Cliente</h2>
        <p className="text-zinc-500 text-lg">Para quem você está enviando esta proposta?</p>
      </div>

      <div className="space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-[0.2em]">Selecionar Cliente Existente</label>
            <select
              value={formData.clienteId}
              onChange={handleClientSelect}
              className="w-full bg-white border border-black/[0.05] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all appearance-none shadow-sm"
            >
              <option value="">-- Novo Cliente --</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome} {c.empresa ? `(${c.empresa})` : ''}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onOpenLeadPicker}
            className="bg-white text-zinc-900 border border-black/[0.05] hover:bg-zinc-50 rounded-2xl px-8 py-4 text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
          >
            <Layers className="w-4 h-4" />
            Importar do ProSync
          </button>
        </div>

        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black/[0.05]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-6 bg-[#F5F5F7] text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300">Ou cadastre um novo</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-[0.2em]">Nome do Cliente *</label>
            <input
              type="text"
              value={formData.clienteNome}
              onChange={e => setFormData(prev => ({ ...prev, clienteNome: e.target.value, clienteId: '' }))}
              placeholder="Ex: João Silva"
              className="w-full bg-white border border-black/[0.05] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-[0.2em]">E-mail do Cliente</label>
            <input
              type="email"
              value={formData.clienteEmail}
              onChange={e => setFormData(prev => ({ ...prev, clienteEmail: e.target.value, clienteId: '' }))}
              placeholder="Ex: joao@empresa.com"
              className="w-full bg-white border border-black/[0.05] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

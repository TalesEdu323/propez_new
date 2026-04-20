import React, { useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { store, Cliente } from '../lib/store';
import { motion } from 'motion/react';
import { createId } from '../lib/ids';
import { useClientes } from '../hooks/useStoreEntity';
import { ClienteModal } from './clientes/ClienteModal';
import { ClientesTable } from './clientes/ClientesTable';
import { ClientesCards } from './clientes/ClientesCards';
import type { NavigateFn } from '../types/navigation';

export default function Clientes({ navigate: _navigate }: { navigate: NavigateFn }) {
  const clientes = useClientes();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Cliente>>({});

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email) return;

    const newCliente: Cliente = {
      id: formData.id || createId(),
      nome: formData.nome,
      empresa: formData.empresa || '',
      email: formData.email,
      telefone: formData.telefone || '',
      data_cadastro: formData.data_cadastro || new Date().toISOString(),
    };

    const updatedClientes = formData.id
      ? clientes.map(c => c.id === formData.id ? newCliente : c)
      : [...clientes, newCliente];

    store.saveClientes(updatedClientes);
    setIsModalOpen(false);
    setFormData({});
  };

  const handleDelete = (id: string) => {
    store.saveClientes(clientes.filter(c => c.id !== id));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-full bg-[#F5F5F7] font-sans selection:bg-zinc-200">
      <div className="page-container">
        
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show" 
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-semibold uppercase tracking-[0.15em]">
              <Users className="w-3.5 h-3.5" />
              CRM & Relacionamento
            </div>
            <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight">
              Clientes.
            </motion.h1>
            <motion.p variants={itemVariants} className="text-zinc-500 font-medium tracking-tight">
              Gerencie sua base de contatos e histórico de parcerias.
            </motion.p>
          </div>
          
          <motion.button 
            variants={itemVariants}
            onClick={() => { setFormData({}); setIsModalOpen(true); }}
            className="group relative flex items-center justify-center gap-2 bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all hover:bg-zinc-800 hover:shadow-2xl hover:shadow-zinc-900/20 active:scale-[0.98] overflow-hidden shadow-xl shadow-zinc-900/10"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            <span>Novo Cliente</span>
          </motion.button>
        </motion.div>

        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show" 
          className="apple-card overflow-hidden"
        >
          <div className="p-6 md:p-10 border-b border-zinc-100/50 bg-zinc-50/30">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text"
                placeholder="Buscar por nome, empresa ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-2xl pl-14 pr-6 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all placeholder:text-zinc-300 shadow-sm"
              />
            </div>
          </div>

          {filteredClientes.length === 0 ? (
            <div className="text-center py-20 sm:py-32 px-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-50 rounded-2xl sm:rounded-[2rem] border border-zinc-100 flex items-center justify-center mx-auto mb-8 sm:mb-10 shadow-sm">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-200" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight mb-2 sm:mb-3">Nenhum cliente encontrado</h3>
              <p className="text-zinc-400 text-xs sm:text-sm font-medium mb-10 sm:mb-12 max-w-xs mx-auto">Comece adicionando seu primeiro cliente para gerenciar propostas e contratos.</p>
              <button 
                onClick={() => { setFormData({}); setIsModalOpen(true); }}
                className="btn-primary inline-flex scale-90 sm:scale-100"
              >
                Adicionar Cliente
              </button>
            </div>
          ) : (
            <>
              <ClientesTable
                clientes={filteredClientes}
                onEdit={(cliente) => { setFormData(cliente); setIsModalOpen(true); }}
                onDelete={handleDelete}
              />
              <ClientesCards
                clientes={filteredClientes}
                onEdit={(cliente) => { setFormData(cliente); setIsModalOpen(true); }}
                onDelete={handleDelete}
              />
            </>
          )}
        </motion.div>

      <ClienteModal
        open={isModalOpen}
        value={formData}
        onChange={setFormData}
        onSubmit={handleSave}
        onClose={() => setIsModalOpen(false)}
      />
      </div>
    </div>
  );
}

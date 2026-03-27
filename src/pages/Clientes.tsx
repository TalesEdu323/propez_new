import React, { useState } from 'react';
import { Plus, Search, MoreVertical, Edit2, Trash2, Mail, Phone, Users } from 'lucide-react';
import { store, Cliente } from '../lib/store';
import { motion, AnimatePresence } from 'motion/react';

export default function Clientes({ navigate }: { navigate: (route: string, params?: any) => void }) {
  const [clientes, setClientes] = useState<Cliente[]>(store.getClientes());
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
      id: formData.id || Math.random().toString(36).substr(2, 9),
      nome: formData.nome,
      empresa: formData.empresa || '',
      email: formData.email,
      telefone: formData.telefone || '',
      data_cadastro: formData.data_cadastro || new Date().toISOString(),
    };

    let updatedClientes;
    if (formData.id) {
      updatedClientes = clientes.map(c => c.id === formData.id ? newCliente : c);
    } else {
      updatedClientes = [...clientes, newCliente];
    }

    setClientes(updatedClientes);
    store.saveClientes(updatedClientes);
    setIsModalOpen(false);
    setFormData({});
  };

  const handleDelete = (id: string) => {
    const updated = clientes.filter(c => c.id !== id);
    setClientes(updated);
    store.saveClientes(updated);
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
              {/* Desktop Table View */}
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
                      {filteredClientes.map((cliente) => (
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
                                onClick={() => { setFormData(cliente); setIsModalOpen(true); }}
                                className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-zinc-100"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(cliente.id)}
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

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-zinc-100">
                <AnimatePresence>
                  {filteredClientes.map((cliente) => (
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
                            onClick={() => { setFormData(cliente); setIsModalOpen(true); }}
                            className="w-10 h-10 flex items-center justify-center text-zinc-400 bg-zinc-50 rounded-xl border border-zinc-100 active:scale-90 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(cliente.id)}
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
            </>
          )}
        </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
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
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white border border-black/[0.05] rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-10 md:p-14 border-b border-zinc-100">
                <h2 className="text-3xl font-semibold text-zinc-900 tracking-tightest">
                  {formData.id ? 'Editar Cliente.' : 'Novo Cliente.'}
                </h2>
                <p className="text-zinc-400 text-sm font-medium mt-3">Preencha as informações básicas do contato.</p>
              </div>
              <form onSubmit={handleSave} className="p-10 md:p-14 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">Nome Completo *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: João Silva"
                      value={formData.nome || ''}
                      onChange={e => setFormData({...formData, nome: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">Empresa</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Apple Inc."
                      value={formData.empresa || ''}
                      onChange={e => setFormData({...formData, empresa: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">E-mail *</label>
                    <input 
                      type="email" 
                      required
                      placeholder="joao@exemplo.com"
                      value={formData.email || ''}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">Telefone</label>
                    <input 
                      type="tel" 
                      placeholder="(11) 99999-9999"
                      value={formData.telefone || ''}
                      onChange={e => setFormData({...formData, telefone: e.target.value})}
                      className="glass-input"
                    />
                  </div>
                </div>
                
                <div className="pt-10 flex items-center justify-end gap-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:text-zinc-900 transition-colors px-4"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="btn-primary"
                  >
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

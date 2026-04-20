import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { store, Servico } from '../lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { formatBRL } from '../lib/format';
import { createId } from '../lib/ids';
import { useContratos, useServicos } from '../hooks/useStoreEntity';
import type { NavigateFn } from '../types/navigation';

export default function Servicos({ navigate: _navigate }: { navigate: NavigateFn }) {
  const servicos = useServicos();
  const contratos = useContratos();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor: '',
    tipo: 'unico' as 'unico' | 'recorrente',
    contratoId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newServico: Servico = {
      id: editingId || createId(),
      nome: formData.nome,
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      tipo: formData.tipo,
      contratoId: formData.contratoId || undefined,
    };

    const updatedServicos = editingId
      ? servicos.map(s => s.id === editingId ? newServico : s)
      : [newServico, ...servicos];

    store.saveServicos(updatedServicos);
    closeModal();
  };

  const handleDelete = (id: string) => {
    store.saveServicos(servicos.filter(s => s.id !== id));
  };

  const openModal = (servico?: Servico) => {
    if (servico) {
      setEditingId(servico.id);
      setFormData({
        nome: servico.nome,
        descricao: servico.descricao,
        valor: servico.valor.toString(),
        tipo: servico.tipo,
        contratoId: servico.contratoId || ''
      });
    } else {
      setEditingId(null);
      setFormData({ nome: '', descricao: '', valor: '', tipo: 'unico', contratoId: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const filteredServicos = servicos.filter(s => 
    s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  return (
    <div className="min-h-full bg-[#F5F5F7] font-sans selection:bg-zinc-200">
      <div className="page-container">
        
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show" 
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 mb-4"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-semibold uppercase tracking-[0.15em]">
              Catálogo
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight">
              Serviços. <span className="text-zinc-400 font-medium">Seu portfólio.</span>
            </h1>
          </div>
          <button 
            onClick={() => openModal()}
            className="btn-primary w-full sm:w-fit"
          >
            <Plus className="w-5 h-5" /> Novo Serviço
          </button>
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
                placeholder="Buscar serviços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-2xl pl-14 pr-6 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all placeholder:text-zinc-300 shadow-sm"
              />
            </div>
          </div>

          {filteredServicos.length === 0 ? (
            <div className="text-center py-20 sm:py-32 px-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-50 rounded-2xl sm:rounded-[2rem] border border-zinc-100 flex items-center justify-center mx-auto mb-8 sm:mb-10 shadow-sm">
                <Search className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-200" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight mb-2 sm:mb-3">Nenhum serviço encontrado</h3>
              <p className="text-zinc-400 text-xs sm:text-sm font-medium mb-10 sm:mb-12 max-w-xs mx-auto">Comece adicionando seus serviços e pacotes para agilizar suas propostas.</p>
              <button 
                onClick={() => openModal()}
                className="btn-primary inline-flex scale-90 sm:scale-100"
              >
                Adicionar Serviço
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 border-b border-zinc-100">
                      <th className="px-10 py-8 font-bold">Nome</th>
                      <th className="px-10 py-8 font-bold">Descrição</th>
                      <th className="px-10 py-8 font-bold">Tipo</th>
                      <th className="px-10 py-8 font-bold">Status</th>
                      <th className="px-10 py-8 font-bold">Valor</th>
                      <th className="px-10 py-8 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    <AnimatePresence>
                      {filteredServicos.map((servico) => (
                        <motion.tr 
                          key={servico.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.3 }}
                          className="hover:bg-zinc-50/50 transition-all group"
                        >
                          <td className="px-10 py-8">
                            <div className="font-bold text-zinc-900 text-lg tracking-tight">{servico.nome}</div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-300 mt-1">ID: {servico.id.slice(0, 8)}</div>
                          </td>
                          <td className="px-10 py-8">
                            <div className="text-sm text-zinc-500 font-medium max-w-xs line-clamp-2">
                              {servico.descricao}
                            </div>
                          </td>
                          <td className="px-10 py-8">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                              servico.tipo === 'recorrente' ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'
                            }`}>
                              {servico.tipo === 'recorrente' ? 'Recorrente' : 'Único'}
                            </span>
                          </td>
                          <td className="px-10 py-8">
                            <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                              Ativo
                            </span>
                          </td>
                          <td className="px-10 py-8">
                            <div className="font-bold text-zinc-900 text-lg tracking-tight">
                              {formatBRL(servico.valor)}
                            </div>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <button 
                                onClick={() => openModal(servico)}
                                className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-zinc-100"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(servico.id)}
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
                  {filteredServicos.map((servico) => (
                    <motion.div 
                      key={servico.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-6 space-y-5"
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-900 text-lg tracking-tight leading-tight truncate">{servico.nome}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                              servico.tipo === 'recorrente' ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'
                            }`}>
                              {servico.tipo === 'recorrente' ? 'Recorrente' : 'Único'}
                            </span>
                          </div>
                        </div>
                        <div className="font-bold text-zinc-900 text-base tracking-tight shrink-0">
                          {formatBRL(servico.valor)}
                        </div>
                      </div>
                      
                      <div className="bg-zinc-50/50 p-5 rounded-2xl border border-zinc-100">
                        <p className="text-xs text-zinc-500 font-medium line-clamp-2 leading-relaxed italic">
                          "{servico.descricao}"
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => openModal(servico)}
                          className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" /> Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(servico.id)}
                          className="w-12 h-12 flex items-center justify-center text-red-500 bg-red-50 rounded-xl border border-red-100 active:scale-95 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10 md:p-14 border-b border-zinc-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-semibold text-zinc-900 tracking-tight">
                    {editingId ? 'Editar Serviço.' : 'Novo Serviço.'}
                  </h2>
                  <button 
                    onClick={closeModal}
                    className="p-3 text-zinc-300 hover:text-zinc-900 hover:bg-zinc-50 rounded-2xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-zinc-400 text-sm font-medium mt-3">Configure os detalhes do seu serviço.</p>
              </div>

              <form onSubmit={handleSubmit} className="p-10 md:p-14 space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Nome do Serviço *</label>
                  <input 
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="glass-input px-6 py-4 w-full text-sm font-medium"
                    placeholder="Ex: Desenvolvimento de Site"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Descrição *</label>
                  <textarea 
                    required
                    rows={3}
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="glass-input px-6 py-4 w-full text-sm font-medium min-h-[120px] resize-none"
                    placeholder="Descreva o serviço..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Valor (R$) *</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      className="glass-input px-6 py-4 w-full text-sm font-medium"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Tipo de Cobrança *</label>
                    <select 
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'unico' | 'recorrente' })}
                      className="glass-input px-6 py-4 w-full text-sm font-medium appearance-none"
                    >
                      <option value="unico">Pagamento Único</option>
                      <option value="recorrente">Recorrente (Mensal)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Contrato Padrão (Opcional)</label>
                  <select 
                    value={formData.contratoId}
                    onChange={(e) => setFormData({ ...formData, contratoId: e.target.value })}
                    className="glass-input px-6 py-4 w-full text-sm font-medium appearance-none"
                  >
                    <option value="">Nenhum contrato vinculado</option>
                    {contratos.map(c => (
                      <option key={c.id} value={c.id}>{c.titulo}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-primary"
                  >
                    Salvar Serviço
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

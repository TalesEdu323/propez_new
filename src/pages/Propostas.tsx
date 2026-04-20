import { useState } from 'react';
import { Plus, Search, FileText, Trash2, Eye, CheckCircle } from 'lucide-react';
import { store } from '../lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { formatBRL } from '../lib/format';
import { usePropostas, useServicos } from '../hooks/useStoreEntity';
import type { NavigateFn } from '../types/navigation';

export default function Propostas({ navigate }: { navigate: NavigateFn }) {
  const propostas = usePropostas();
  const servicos = useServicos();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todas' | 'pendente' | 'aprovada' | 'recusada'>('todas');

  const getServicosNomes = (ids: string[]) => {
    if (!ids || ids.length === 0) return 'Nenhum serviço';
    const nomes = ids.map(id => servicos.find(s => s.id === id)?.nome).filter(Boolean);
    return nomes.length > 0 ? nomes.join(', ') : 'Serviços não encontrados';
  };

  const filteredPropostas = propostas.filter(p => {
    const matchesSearch = p.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      getServicosNomes(p.servicos).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'todas' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string) => {
    store.savePropostas(propostas.filter(p => p.id !== id));
  };

  const handleStatusChange = (id: string, newStatus: 'pendente' | 'aprovada' | 'recusada') => {
    store.savePropostas(propostas.map(p => p.id === id ? { ...p, status: newStatus } : p));
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
              <FileText className="w-3.5 h-3.5" />
              Gestão de Negócios
            </div>
            <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight">
              Propostas.
            </motion.h1>
            <motion.p variants={itemVariants} className="text-zinc-500 font-medium tracking-tight">
              Acompanhe o status e gerencie suas propostas enviadas.
            </motion.p>
          </div>
          
          <motion.button 
            variants={itemVariants}
            onClick={() => navigate('propez-fluido')}
            className="group relative flex items-center justify-center gap-2 bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all hover:bg-zinc-800 hover:shadow-2xl hover:shadow-zinc-900/20 active:scale-[0.98] overflow-hidden shadow-xl shadow-zinc-900/10"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            <span>Nova Proposta</span>
          </motion.button>
        </motion.div>

        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show" 
          className="apple-card overflow-hidden"
        >
          <div className="p-6 md:p-10 border-b border-zinc-100/50 bg-zinc-50/30">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="relative max-w-md w-full">
                <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text"
                  placeholder="Buscar por cliente ou serviço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="glass-input pl-12 pr-5 py-3.5 text-sm font-medium"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                {(['todas', 'pendente', 'aprovada', 'recusada'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all whitespace-nowrap ${
                      filterStatus === status 
                        ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20' 
                        : 'bg-white text-zinc-400 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-600'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredPropostas.length === 0 ? (
            <div className="text-center py-20 sm:py-32 px-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-50 rounded-2xl sm:rounded-[2rem] border border-zinc-100 flex items-center justify-center mx-auto mb-8 sm:mb-10 shadow-sm">
                <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-200" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight mb-2 sm:mb-3">Nenhuma proposta encontrada</h3>
              <p className="text-zinc-400 text-xs sm:text-sm font-medium mb-10 sm:mb-12 max-w-xs mx-auto">Crie sua primeira proposta para começar a fechar negócios.</p>
              <button 
                onClick={() => navigate('propez-fluido')}
                className="btn-primary inline-flex scale-90 sm:scale-100"
              >
                Criar Proposta
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 border-b border-zinc-100">
                      <th className="px-8 py-6 font-bold">Cliente</th>
                      <th className="px-8 py-6 font-bold">Serviços</th>
                      <th className="px-8 py-6 font-bold">Valor</th>
                      <th className="px-8 py-6 font-bold">Status</th>
                      <th className="px-8 py-6 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    <AnimatePresence>
                      {filteredPropostas.map((proposta) => (
                        <motion.tr 
                          key={proposta.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="hover:bg-zinc-50/50 transition-all group"
                        >
                          <td className="px-8 py-7">
                            <div className="font-bold text-zinc-900 text-base tracking-tight">{proposta.cliente_nome}</div>
                            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1">
                              {new Date(proposta.data_criacao).toLocaleDateString('pt-BR')}
                            </div>
                          </td>
                          <td className="px-8 py-7">
                            <div className="text-sm text-zinc-500 font-medium max-w-xs truncate">
                              {getServicosNomes(proposta.servicos)}
                            </div>
                          </td>
                          <td className="px-8 py-7">
                            <div className="font-bold text-zinc-900 text-base tracking-tight">
                              {formatBRL(proposta.valor)}
                            </div>
                          </td>
                          <td className="px-8 py-7">
                            <span className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                              proposta.status === 'aprovada' ? 'bg-emerald-50 text-emerald-600' :
                              proposta.status === 'recusada' ? 'bg-red-50 text-red-600' :
                              'bg-zinc-100 text-zinc-500'
                            }`}>
                              {proposta.status}
                            </span>
                          </td>
                          <td className="px-8 py-7 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => navigate('visualizar-proposta', { id: proposta.id })}
                                className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                                title="Visualizar"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleStatusChange(proposta.id, proposta.status === 'aprovada' ? 'pendente' : 'aprovada')}
                                className={`p-2.5 rounded-xl transition-all ${
                                  proposta.status === 'aprovada' ? 'text-amber-400 hover:text-amber-600 hover:bg-amber-50' : 'text-zinc-400 hover:text-zinc-900 hover:bg-white hover:shadow-sm'
                                }`}
                                title={proposta.status === 'aprovada' ? 'Marcar como Pendente' : 'Aprovar'}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(proposta.id)}
                                className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
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
                  {filteredPropostas.map((proposta) => (
                    <motion.div 
                      key={proposta.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-6 space-y-5"
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-900 text-lg tracking-tight leading-tight truncate">{proposta.cliente_nome}</div>
                          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mt-1.5">
                            {new Date(proposta.data_criacao).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                          proposta.status === 'aprovada' ? 'bg-emerald-50 text-emerald-600' :
                          proposta.status === 'recusada' ? 'bg-red-50 text-red-600' :
                          'bg-zinc-100 text-zinc-500'
                        }`}>
                          {proposta.status}
                        </span>
                      </div>
                      
                      <div className="bg-zinc-50/50 p-5 rounded-2xl border border-zinc-100 space-y-4">
                        <div className="text-[11px] text-zinc-500 font-medium line-clamp-1">
                          {getServicosNomes(proposta.servicos)}
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                          <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Valor Total</div>
                          <div className="text-lg font-bold text-zinc-900 tracking-tight">
                            {formatBRL(proposta.valor)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => navigate('visualizar-proposta', { id: proposta.id })}
                          className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" /> Visualizar
                        </button>
                        <button 
                          onClick={() => handleDelete(proposta.id)}
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
    </div>
  );
}

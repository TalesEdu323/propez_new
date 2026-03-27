import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { store, ModeloProposta } from '../lib/store';

export default function Modelos({ navigate }: { navigate: (route: string, params?: any) => void }) {
  const [modelos, setModelos] = useState<ModeloProposta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setModelos(store.getModelos());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este modelo?')) {
      const updated = modelos.filter(m => m.id !== id);
      store.saveModelos(updated);
      setModelos(updated);
    }
  };

  const filteredModelos = modelos.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <div className="p-[7px] md:p-10 max-w-7xl mx-auto font-sans pb-[87px] md:pb-10">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 mb-16 px-1 md:px-0">
        <motion.div variants={itemVariants}>
          <h1 className="text-4xl md:text-6xl font-semibold text-zinc-900 tracking-tightest leading-none">Modelos.</h1>
          <p className="text-zinc-400 mt-4 font-medium">Crie e gerencie seus templates de propostas.</p>
        </motion.div>
        <motion.button 
          variants={itemVariants}
          onClick={() => navigate('criar-modelo')}
          className="btn-primary w-full sm:w-fit"
        >
          <Plus className="w-5 h-5" /> Novo Modelo
        </motion.button>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="apple-card overflow-hidden mx-0 !p-0">
        <div className="p-8 md:p-10 border-b border-zinc-100/50">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" />
            <input 
              type="text"
              placeholder="Buscar modelos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input pl-12 pr-6 py-4 w-full text-sm font-medium"
            />
          </div>
        </div>

        {filteredModelos.length === 0 ? (
          <div className="text-center py-24 px-6">
            <div className="w-20 h-20 bg-zinc-50 rounded-2xl border border-black/[0.02] flex items-center justify-center mx-auto mb-8">
              <FileText className="w-8 h-8 text-zinc-200" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 tracking-tight mb-2">Nenhum modelo encontrado</h3>
            <p className="text-zinc-400 text-sm font-medium mb-10 max-w-xs mx-auto">Crie modelos de propostas para economizar tempo no dia a dia.</p>
            <button 
              onClick={() => navigate('criar-modelo')}
              className="text-zinc-900 font-bold text-[10px] uppercase tracking-widest hover:text-zinc-600 transition-colors"
            >
              Criar Modelo
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 bg-zinc-50/30">
                    <th className="px-10 py-5 font-bold">Nome do Modelo</th>
                    <th className="px-10 py-5 font-bold">Serviços Inclusos</th>
                    <th className="px-10 py-5 font-bold">Data de Criação</th>
                    <th className="px-10 py-5 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100/50">
                  <AnimatePresence>
                    {filteredModelos.map((modelo) => (
                      <motion.tr 
                        key={modelo.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="hover:bg-zinc-50/50 transition-all group"
                      >
                        <td className="px-10 py-8">
                          <div className="font-semibold text-zinc-900 text-lg tracking-tight">{modelo.nome}</div>
                          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-300 mt-1">ID: {modelo.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="text-sm text-zinc-500 font-medium max-w-xs truncate">
                            {modelo.servicos.length} serviço(s) inclusos
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="text-sm font-medium text-zinc-400">
                            {new Date(modelo.data_criacao).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => navigate('criar-modelo', { editId: modelo.id })}
                              className="p-2.5 text-zinc-300 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(modelo.id)}
                              className="p-2.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
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
            <div className="md:hidden divide-y divide-zinc-100/50">
              <AnimatePresence>
                {filteredModelos.map((modelo) => (
                  <motion.div 
                    key={modelo.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-8 space-y-6"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-zinc-900 text-xl tracking-tight leading-tight">{modelo.nome}</div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-300 mt-2">ID: {modelo.id.slice(0, 8)}</div>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-50/50 p-6 rounded-[2rem] border border-black/[0.02]">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-300 mb-2">Serviços inclusos</div>
                      <div className="text-sm text-zinc-500 font-medium line-clamp-2">
                        {modelo.servicos.length} serviço(s) inclusos
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-300 mt-4 mb-1">Criado em</div>
                      <div className="text-sm text-zinc-400 font-medium">
                        {new Date(modelo.data_criacao).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => navigate('criar-modelo', { editId: modelo.id })}
                        className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" /> Editar Modelo
                      </button>
                      <button 
                        onClick={() => handleDelete(modelo.id)}
                        className="p-4 text-red-400 bg-red-50 rounded-2xl border border-red-50 active:scale-95 transition-all"
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
  );
}

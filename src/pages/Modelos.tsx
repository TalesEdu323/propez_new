import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { store } from '../lib/store';
import { useModelos } from '../hooks/useStoreEntity';
import { formatDateBR } from '../lib/format';
import type { NavigateFn, ModelosTab } from '../types/navigation';
import { LojaTemplatesPanel } from './modelos/LojaTemplatesPanel';
import { ListingViewToggle } from '../components/listing/ListingViewToggle';
import { useListingViewPref } from '../hooks/useListingViewPref';
import { LISTING_GRID_CLASS, LISTING_LIST_CLASS } from '../components/listing/listingLayout';

const MODELOS_VIEW_KEY = 'listing_view:modelos';

export default function Modelos({
  navigate,
  initialTab = 'meus',
}: {
  navigate: NavigateFn;
  initialTab?: ModelosTab;
}) {
  const modelos = useModelos();
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<ModelosTab>(initialTab);
  const [listView, setListView] = useListingViewPref(MODELOS_VIEW_KEY, 'grid');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este modelo?')) {
      store.saveModelos(modelos.filter((m) => m.id !== id));
    }
  };

  const filteredModelos = modelos.filter((m) =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="p-[7px] md:p-10 max-w-7xl mx-auto font-sans pb-[87px] md:pb-10">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 mb-6 px-1 md:px-0"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <motion.div variants={itemVariants}>
            <h1 className="page-title">Modelos.</h1>
            <p className="text-zinc-400 mt-4 font-medium">
              Gerencie seus templates ou explore a loja da plataforma.
            </p>
          </motion.div>
          {tab === 'meus' ? (
            <motion.button
              variants={itemVariants}
              onClick={() => navigate('criar-modelo')}
              className="btn-primary w-full sm:w-fit"
            >
              <Plus className="w-5 h-5" /> Novo Modelo
            </motion.button>
          ) : (
            <motion.button
              variants={itemVariants}
              onClick={() => navigate('criar-modelo')}
              className="btn-secondary w-full sm:w-fit"
            >
              <Plus className="w-5 h-5" /> Criar do zero
            </motion.button>
          )}
        </div>

        <motion.div variants={itemVariants} className="inline-flex p-1 bg-zinc-100 rounded-2xl self-start">
          <button
            type="button"
            onClick={() => setTab('meus')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'meus'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Meus modelos
          </button>
          <button
            type="button"
            onClick={() => setTab('loja')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'loja'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Loja
          </button>
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        {tab === 'loja' ? (
          <motion.div
            key="loja"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <LojaTemplatesPanel navigate={navigate} embedded />
          </motion.div>
        ) : (
          <motion.div
            key="meus"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="apple-card overflow-hidden mx-0 !p-0"
          >
            <div className="p-8 md:p-10 border-b border-zinc-100/50">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="relative max-w-md w-full flex-1">
                  <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" />
                  <input
                    type="text"
                    placeholder="Buscar modelos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input pl-12 pr-6 py-4 w-full text-sm font-medium"
                  />
                </div>
                <ListingViewToggle
                  view={listView}
                  onChange={setListView}
                />
              </div>
            </div>

            {filteredModelos.length === 0 ? (
              <div className="text-center py-24 px-6">
                <div className="w-20 h-20 bg-zinc-50 rounded-2xl border border-black/[0.02] flex items-center justify-center mx-auto mb-8">
                  <FileText className="w-8 h-8 text-zinc-200" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 tracking-tight mb-2">Nenhum modelo encontrado</h3>
                <p className="text-zinc-400 text-sm font-medium mb-6 max-w-xs mx-auto">
                  Crie modelos de propostas ou explore a loja de templates.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => navigate('criar-modelo')}
                    className="text-zinc-900 font-bold text-[10px] uppercase tracking-widest hover:text-zinc-600 transition-colors"
                  >
                    Criar Modelo
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('loja')}
                    className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest hover:text-zinc-900 transition-colors"
                  >
                    Ver Loja
                  </button>
                </div>
              </div>
            ) : listView === 'list' ? (
              <div className={`${LISTING_LIST_CLASS} p-4 sm:p-6`}>
                <div className="overflow-x-auto">
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
                              <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-300 mt-1">
                                ID: {modelo.id.slice(0, 8)}
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <div className="text-sm text-zinc-500 font-medium max-w-xs truncate">
                                {modelo.servicos.length} serviço(s) inclusos
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <div className="text-sm font-medium text-zinc-400">
                                {formatDateBR(modelo.data_criacao)}
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
              </div>
            ) : (
              <div className={`${LISTING_GRID_CLASS} p-6 sm:p-10`}>
                <AnimatePresence mode="popLayout">
                  {filteredModelos.map((modelo, index) => (
                    <motion.div
                      key={modelo.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ delay: index * 0.04 }}
                      className="apple-card apple-card-hover group cursor-pointer !p-6 flex flex-col h-full"
                      onClick={() => navigate('criar-modelo', { editId: modelo.id })}
                    >
                      <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-4 border border-zinc-100">
                        <FileText className="w-6 h-6 text-zinc-400" />
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900 line-clamp-1">{modelo.nome}</h3>
                      <p className="text-xs text-zinc-400 mt-2 flex-grow">
                        {modelo.servicos.length} serviço(s) · {formatDateBR(modelo.data_criacao)}
                      </p>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('criar-modelo', { editId: modelo.id });
                          }}
                          className="flex-1 text-[9px] font-bold uppercase tracking-widest text-zinc-600"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(modelo.id);
                          }}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState } from 'react';
import { Plus, Search, FileText, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { store, ContratoTemplate } from '../lib/store';
import ContractEditor from '../components/ContractEditor';
import { useContratos } from '../hooks/useStoreEntity';
import { createId } from '../lib/ids';
import { formatDateBR } from '../lib/format';

export default function Contratos() {
  const contratos = useContratos();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentContrato, setCurrentContrato] = useState<Partial<ContratoTemplate> | null>(null);

  const handleSave = () => {
    if (!currentContrato?.titulo || !currentContrato?.texto) {
      alert('Preencha o título e o texto do contrato.');
      return;
    }

    const newContrato: ContratoTemplate = {
      id: currentContrato.id || createId(),
      titulo: currentContrato.titulo,
      texto: currentContrato.texto,
      data_criacao: currentContrato.data_criacao || new Date().toISOString(),
    };

    const updated = currentContrato.id
      ? contratos.map(c => c.id === newContrato.id ? newContrato : c)
      : [newContrato, ...contratos];

    store.saveContratos(updated);
    setIsEditing(false);
    setCurrentContrato(null);
  };

  const handleDelete = (id: string) => {
    store.saveContratos(contratos.filter(c => c.id !== id));
  };

  const filteredContratos = contratos.filter(c => 
    c.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isEditing) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-6 border-b border-black/5 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setIsEditing(false);
                setCurrentContrato(null);
              }}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
                {currentContrato?.id ? 'Editar Contrato' : 'Novo Modelo de Contrato'}
              </h1>
              <p className="text-xs text-zinc-500">Defina os termos legais padrão</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            className="bg-[#0a0a0a] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-[0.98]"
          >
            Salvar Modelo
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-black/5">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Título do Modelo</label>
            <input 
              type="text"
              value={currentContrato?.titulo || ''}
              onChange={e => setCurrentContrato({...currentContrato, titulo: e.target.value})}
              placeholder="Ex: Contrato de Prestação de Serviços Web"
              className="w-full text-2xl font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none"
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <ContractEditor 
              value={currentContrato?.texto || ''}
              onChange={val => setCurrentContrato({...currentContrato, texto: val})}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F5F5F7] font-sans selection:bg-zinc-200">
      <div className="page-container">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 mb-4">
          <div>
            <h1 className="text-4xl md:text-6xl font-semibold text-zinc-900 tracking-tightest leading-none">Contratos.</h1>
            <p className="text-zinc-400 mt-4 font-medium">Gerencie seus modelos de contrato e termos legais.</p>
          </div>
          <button 
            onClick={() => {
              setCurrentContrato({ titulo: '', texto: '' });
              setIsEditing(true);
            }}
            className="btn-primary w-full sm:w-fit"
          >
            <Plus className="w-5 h-5" /> Novo Contrato
          </button>
        </div>

        <div className="apple-card overflow-hidden mx-0 !p-0">
          <div className="p-6 md:p-10 border-b border-zinc-100/50 bg-zinc-50/30">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" />
              <input 
                type="text"
                placeholder="Buscar contratos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input pl-12 pr-6 py-4 w-full text-sm font-medium"
              />
            </div>
          </div>

          {filteredContratos.length === 0 ? (
            <div className="text-center py-20 sm:py-32 px-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-50 rounded-2xl sm:rounded-[2rem] border border-black/[0.02] flex items-center justify-center mx-auto mb-8 sm:mb-10">
                <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-200" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight mb-2 sm:mb-3">Nenhum contrato encontrado</h3>
              <p className="text-zinc-400 text-xs sm:text-sm font-medium mb-10 sm:mb-12 max-w-xs mx-auto">Crie modelos de contrato para anexar às suas propostas.</p>
              <button 
                onClick={() => {
                  setCurrentContrato({ titulo: '', texto: '' });
                  setIsEditing(true);
                }}
                className="btn-primary inline-flex scale-90 sm:scale-100"
              >
                Criar Contrato
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 p-6 sm:p-10">
            <AnimatePresence mode="popLayout">
              {filteredContratos.map((contrato, index) => (
                <motion.div
                  key={contrato.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="apple-card apple-card-hover group cursor-pointer !p-6 sm:!p-8 flex flex-col h-full"
                  onClick={() => {
                    setCurrentContrato(contrato);
                    setIsEditing(true);
                  }}
                >
                  <div className="flex justify-between items-start mb-6 sm:mb-8">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-zinc-50 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all duration-500 border border-black/[0.02]">
                      <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(contrato.id);
                      }}
                      className="p-2.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all md:opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-lg sm:text-xl font-semibold text-zinc-900 mb-2 sm:mb-3 group-hover:text-zinc-900 transition-colors line-clamp-1 tracking-tight">
                    {contrato.titulo}
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm mb-6 sm:mb-8 line-clamp-3 leading-relaxed font-medium flex-grow">
                    {contrato.texto.replace(/<[^>]*>/g, '').substring(0, 150)}...
                  </p>

                  <div className="flex items-center justify-between pt-5 sm:pt-6 border-t border-zinc-100/50">
                    <span className="text-[8px] sm:text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                      {formatDateBR(contrato.data_criacao)}
                    </span>
                    <div className="flex items-center gap-2 text-zinc-300 group-hover:text-zinc-900 transition-all">
                      <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest">Editar</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}

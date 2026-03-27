import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Save, FileText, Link as LinkIcon, DollarSign, LayoutTemplate, Layers, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { store, ModeloProposta, Servico, Cliente } from '../lib/store';
import Builder from '../components/Builder';

export default function CriarModelo({ navigate, initialData }: { navigate: (route: string) => void, initialData?: any }) {
  const [step, setStep] = useState(1);
  const [servicosDisponiveis, setServicosDisponiveis] = useState<Servico[]>([]);
  
  const [formData, setFormData] = useState({
    nome: '',
    servicos: [] as string[],
    contratoTexto: '',
    contratoId: '',
    chavePix: '',
    linkPagamento: ''
  });

  const [contratos, setContratos] = useState(store.getContratos());
  const [elementos, setElementos] = useState<any[]>([]);

  useEffect(() => {
    setServicosDisponiveis(store.getServicos());
    setContratos(store.getContratos());

    if (initialData?.editId) {
      const modelo = store.getModelos().find(m => m.id === initialData.editId);
      if (modelo) {
        setFormData({
          nome: modelo.nome,
          servicos: modelo.servicos,
          contratoTexto: modelo.contratoTexto || '',
          contratoId: modelo.contratoId || '',
          chavePix: modelo.chavePix || '',
          linkPagamento: modelo.linkPagamento || ''
        });
        setElementos(modelo.elementos);
      }
    }
  }, [initialData]);

  const handleSave = (finalElements: any[]) => {
    const newModelo: ModeloProposta = {
      id: initialData?.editId || crypto.randomUUID(),
      nome: formData.nome,
      servicos: formData.servicos,
      contratoTexto: formData.contratoTexto,
      contratoId: formData.contratoId || undefined,
      chavePix: formData.chavePix,
      linkPagamento: formData.linkPagamento,
      elementos: finalElements,
      data_criacao: new Date().toISOString()
    };

    const modelos = store.getModelos();
    if (initialData?.editId) {
      store.saveModelos(modelos.map(m => m.id === newModelo.id ? newModelo : m));
    } else {
      store.saveModelos([newModelo, ...modelos]);
    }

    navigate('modelos');
  };

  const toggleServico = (id: string) => {
    setFormData(prev => ({
      ...prev,
      servicos: prev.servicos.includes(id) 
        ? prev.servicos.filter(s => s !== id)
        : [...prev.servicos, id]
    }));
  };

  if (step === 3) {
    return (
      <motion.div 
        className="h-screen w-full bg-transparent flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Builder 
          initialElements={elementos} 
          onSave={handleSave} 
          onBack={() => setStep(2)} 
          saveLabel="Salvar Modelo"
        />
      </motion.div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#f5f5f4] overflow-hidden font-sans">
      {/* Left Panel - Progress & Summary */}
      <div className="w-[30%] min-w-[320px] max-w-[400px] bg-[#0a0a0a] text-white p-10 flex flex-col justify-between relative overflow-hidden hidden md:flex">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <button 
            onClick={() => navigate('modelos')} 
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-16"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          
          <h1 className="text-4xl font-semibold tracking-tight mb-4 leading-tight">
            {initialData?.editId ? 'Editar Modelo' : 'Novo Modelo'}
          </h1>
          <p className="text-white/50 text-sm mb-16 leading-relaxed">
            Crie templates reutilizáveis para agilizar a criação de propostas futuras.
          </p>
          
          {/* Vertical Stepper */}
          <div className="space-y-8">
            <div className="flex items-start gap-5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${
                step > 1 ? 'bg-white border-white text-black' : 
                step === 1 ? 'border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-white/20 text-white/20'
              }`}>
                {step > 1 ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">1</span>}
              </div>
              <div className={`pt-1.5 transition-all duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-40'}`}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-1">Configurações Base</h3>
                <p className="text-sm text-white/50">Nome, serviços e pagamentos</p>
              </div>
            </div>
            
            <div className="flex items-start gap-5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${
                step > 2 ? 'bg-white border-white text-black' : 
                step === 2 ? 'border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-white/20 text-white/20'
              }`}>
                {step > 2 ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">2</span>}
              </div>
              <div className={`pt-1.5 transition-all duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-40'}`}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-1">Contrato Padrão</h3>
                <p className="text-sm text-white/50">Selecione o contrato</p>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${
                step > 3 ? 'bg-white border-white text-black' : 
                step === 3 ? 'border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-white/20 text-white/20'
              }`}>
                <span className="text-xs font-bold">3</span>
              </div>
              <div className={`pt-1.5 transition-all duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-40'}`}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-1">Editor Visual</h3>
                <p className="text-sm text-white/50">Construa o layout da página</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative z-10">
          {/* Live Summary */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">Resumo do Modelo</h4>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-white/60">Nome</span>
                <span className="font-medium text-right max-w-[150px] truncate">{formData.nome || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">Serviços Inclusos</span>
                <span className="font-medium">{formData.servicos.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Form */}
      <div className="flex-1 bg-white h-full overflow-y-auto relative flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden p-6 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-20">
          <button onClick={() => navigate('modelos')} className="p-2 -ml-2 text-zinc-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Passo {step} de 3</span>
          <div className="w-9" />
        </div>

        <div className="flex-1 w-full max-w-3xl mx-auto py-12 px-6 md:py-20 md:px-16 flex flex-col">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-3xl font-semibold text-zinc-900 mb-2 tracking-tight">Configurações do Modelo</h2>
                  <p className="text-zinc-500 mb-12">Defina as informações padrão que serão carregadas ao usar este modelo.</p>
                  
                  <div className="space-y-10">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Nome do Modelo *</label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-black/5"
                        placeholder="Ex: Proposta Padrão - Desenvolvimento Web"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest">Serviços Inclusos no Modelo</label>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {servicosDisponiveis.length === 0 ? (
                          <div className="text-sm text-zinc-500 text-center p-8 bg-zinc-50 rounded-2xl border border-black/5">Nenhum serviço cadastrado.</div>
                        ) : (
                          servicosDisponiveis.map(servico => (
                            <label key={servico.id} className={`flex items-center gap-4 cursor-pointer p-4 rounded-2xl border transition-all ${
                              formData.servicos.includes(servico.id) ? 'border-black bg-black/5' : 'border-black/5 hover:border-black/20'
                            }`}>
                              <input 
                                type="checkbox"
                                checked={formData.servicos.includes(servico.id)}
                                onChange={() => toggleServico(servico.id)}
                                className="w-5 h-5 text-black rounded border-black/20 focus:ring-black accent-black"
                              />
                              <div>
                                <span className="block text-sm font-semibold text-zinc-900">{servico.nome}</span>
                                <span className="block text-xs text-zinc-500 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servico.valor)}</span>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-zinc-900 tracking-tight border-b border-black/5 pb-4">Pagamento Padrão</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Chave PIX Padrão</label>
                          <input
                            type="text"
                            value={formData.chavePix}
                            onChange={(e) => setFormData({...formData, chavePix: e.target.value})}
                            className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                            placeholder="CNPJ, Email, Telefone..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Link de Pagamento Padrão</label>
                          <input
                            type="url"
                            value={formData.linkPagamento}
                            onChange={(e) => setFormData({...formData, linkPagamento: e.target.value})}
                            className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full flex flex-col"
                >
                  <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-semibold text-zinc-900 mb-2 tracking-tight">Contrato Padrão</h2>
                      <p className="text-zinc-500">Selecione um dos seus templates de contrato para este modelo.</p>
                    </div>
                    
                    <div className="w-full sm:w-64">
                      <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">Escolher Template *</label>
                      <select
                        value={formData.contratoId}
                        onChange={(e) => {
                          const templateId = e.target.value;
                          const template = contratos.find(c => c.id === templateId);
                          if (template) {
                            setFormData({
                              ...formData,
                              contratoId: templateId,
                              contratoTexto: template.texto
                            });
                          } else {
                            setFormData({
                              ...formData,
                              contratoId: '',
                              contratoTexto: ''
                            });
                          }
                        }}
                        className="w-full bg-zinc-50 border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                      >
                        <option value="">Selecione um contrato...</option>
                        {contratos.map(c => (
                          <option key={c.id} value={c.id}>{c.titulo}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-zinc-50 rounded-2xl border border-black/5 p-8 overflow-y-auto max-h-[600px]">
                    {formData.contratoTexto ? (
                      <div className="prose prose-zinc max-w-none font-serif text-zinc-800 whitespace-pre-wrap">
                        {formData.contratoTexto}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-20">
                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">Nenhum contrato selecionado.</p>
                        <p className="text-xs mt-1">Selecione um template acima para visualizar o conteúdo.</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-4 text-center uppercase tracking-widest">
                    Para editar o texto do contrato, acesse o menu "Contratos" no painel lateral.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className="mt-12 pt-8 border-t border-black/5 flex items-center justify-between">
            <button 
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                step === 1 ? 'opacity-0 pointer-events-none' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              Anterior
            </button>
            
            <button 
              onClick={() => {
                if (step === 1) {
                  if (!formData.nome) {
                    alert('Por favor, dê um nome ao modelo.');
                    return;
                  }
                  setStep(2);
                } else if (step === 2) {
                  setStep(3);
                }
              }}
              className="bg-[#0a0a0a] text-white hover:bg-zinc-800 rounded-xl px-8 py-4 text-sm font-medium transition-all active:scale-[0.98] flex items-center gap-2 shadow-lg shadow-black/10"
            >
              {step === 2 ? 'Ir para o Editor Visual' : 'Próximo Passo'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

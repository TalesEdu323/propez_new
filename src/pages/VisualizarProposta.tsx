import React, { useEffect, useState } from 'react';
import { ChevronLeft, DollarSign, CheckCircle, FileCheck, Users, X, FileText } from 'lucide-react';
import { store, Proposta } from '../lib/store';
import { RenderElement } from '../components/Builder';
import { motion, AnimatePresence } from 'motion/react';
import { updateProposalStatusInCRM, syncProductWithCRM } from '../services/crmApi';
import { sendToRubricaForSigning } from '../services/rubricaApi';

export default function VisualizarProposta({ navigate, id }: { navigate: (route: string) => void, id: string }) {
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [viewState, setViewState] = useState<'proposal' | 'contract'>('proposal');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showIdentification, setShowIdentification] = useState(false);
  const [clientData, setClientData] = useState({
    nome: '',
    email: '',
    documento: '' // CPF/CNPJ
  });

  const [userConfig] = useState(() => store.getUserConfig());

  useEffect(() => {
    const p = store.getPropostas().find(p => p.id === id);
    if (p) {
      setProposta(p);
      // Pega o email do usuário que usou anteriormente (localStorage)
      const lastEmail = localStorage.getItem('propez_last_email') || '';
      setClientData(prev => ({ ...prev, nome: p.cliente_nome, email: lastEmail }));
      if (p.status === 'aprovada') {
        setViewState('contract');
      }
    }
  }, [id]);

  const servicos = store.getServicos();

  const getServicosNomes = (ids: string[]) => {
    if (!ids || ids.length === 0) return 'Nenhum serviço';
    const nomes = ids.map(id => servicos.find(s => s.id === id)?.nome).filter(Boolean);
    return nomes.length > 0 ? nomes.join(', ') : 'Serviços não encontrados';
  };

  const handleApprove = async () => {
    if (!proposta) return;
    
    if (!clientData.documento || !clientData.email) {
      setShowIdentification(true);
      return;
    }

    setIsUpdating(true);
    
    try {
      // 1. Update local state/store
      const updatedPropostas = store.getPropostas().map(p => 
        p.id === proposta.id ? { ...p, status: 'aprovada' as const } : p
      );
      store.savePropostas(updatedPropostas);
      setProposta({ ...proposta, status: 'aprovada' });
      
      // 2. Notify external CRM (ProSync)
      await updateProposalStatusInCRM({
        proposalId: proposta.id,
        crmClientId: proposta.cliente_id,
        status: 'aprovada',
        value: proposta.valor,
        updatedAt: new Date().toISOString(),
        clientEmail: clientData.email,
        clientDocument: clientData.documento,
        products: proposta.servicos // Sincronizando produtos base
      });

      // 2.1 Sync individual products with CRM
      const servicosDisponiveis = store.getServicos();
      for (const servicoId of proposta.servicos) {
        const s = servicosDisponiveis.find(item => item.id === servicoId);
        if (s) {
          await syncProductWithCRM({ id: s.id, nome: s.nome, valor: s.valor });
        }
      }

      // 3. Send to Rubrica for signing (Mandatory)
      if (proposta.contratoTexto) {
        await sendToRubricaForSigning({
          proposalId: proposta.id,
          clientName: clientData.nome || proposta.cliente_nome,
          clientEmail: clientData.email,
          clientDocument: clientData.documento,
          contractText: proposta.contratoTexto,
          value: proposta.valor
        });
      }

      setViewState('contract');
      setShowIdentification(false);
      // Salva o email para uso futuro
      localStorage.setItem('propez_last_email', clientData.email);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Erro ao aprovar proposta. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!proposta) return;
    setIsUpdating(true);
    
    try {
      // 1. Update local state/store
      const updatedPropostas = store.getPropostas().map(p => 
        p.id === proposta.id ? { ...p, status: 'recusada' as const } : p
      );
      store.savePropostas(updatedPropostas);
      setProposta({ ...proposta, status: 'recusada' });
      
      // 2. Notify external CRM
      await updateProposalStatusInCRM({
        proposalId: proposta.id,
        crmClientId: proposta.cliente_id, // Usando o ID real do cliente (pode ser do ProSync)
        status: 'recusada',
        value: proposta.valor,
        updatedAt: new Date().toISOString()
      });

      alert('Proposta recusada.');
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Erro ao recusar proposta. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!proposta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center glass-panel p-10 rounded-3xl"
        >
          <h2 className="text-2xl font-bold text-zinc-900 mb-4 tracking-tight">Proposta não encontrada</h2>
          <button onClick={() => navigate('propostas')} className="text-zinc-500 hover:text-black font-medium transition-colors">Voltar para Propostas</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbf9] relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-200/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-100/20 rounded-full blur-[120px]" />
      </div>

      {/* Header (Only visible to the user viewing it in the app, not the final client) */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 h-20 border-b border-black/[0.03] flex items-center px-8 z-50 bg-white/70 backdrop-blur-2xl"
      >
        <button 
          onClick={() => navigate('propostas')}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-all font-bold text-[10px] uppercase tracking-[0.2em]"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="ml-auto text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          Visualizando Proposta: <span className="text-zinc-900">{proposta.cliente_nome}</span>
        </div>
      </motion.div>

      <div className="pt-24 px-4 pb-12 relative z-10">
        <AnimatePresence mode="wait">
          {proposta.elementos.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-[calc(100vh-12rem)]"
            >
              <div className="apple-card text-center">
                <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">Esta proposta está vazia.</p>
              </div>
            </motion.div>
          ) : viewState === 'proposal' ? (
            <motion.div 
              key="proposal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              className="pb-24"
            >
              <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-black/[0.03]">
                {proposta.elementos.map((el) => (
                  <RenderElement key={el.id} element={el} previewMode={true} />
                ))}
              </div>

              {/* Ações da Proposta */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-3xl mx-auto mt-12 p-10 md:p-16 apple-card text-center"
              >
                <div className="mb-12 inline-flex flex-col items-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3">Investimento Total</span>
                  <div className="text-5xl md:text-6xl font-bold text-zinc-900 tracking-tight">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposta.valor)}
                  </div>
                  {(proposta.chavePix || proposta.linkPagamento) && (
                    <div className="flex gap-3 mt-6">
                      {proposta.chavePix && (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-zinc-900 text-white rounded-full text-[9px] font-bold uppercase tracking-[0.15em] shadow-lg shadow-black/10">
                          <CheckCircle className="w-3 h-3" /> PIX
                        </div>
                      )}
                      {proposta.linkPagamento && (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 text-zinc-500 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] border border-black/[0.03]">
                          <DollarSign className="w-3 h-3" /> Cartão
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <h2 className="text-3xl font-bold text-zinc-900 mb-10 tracking-tight">O que achou da proposta?</h2>
                
                {proposta.status === 'pendente' ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                      onClick={handleReject} 
                      disabled={isUpdating}
                      className="w-full sm:w-auto h-14 px-10 bg-zinc-50 text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50 border border-black/[0.03]"
                    >
                      {isUpdating ? 'Processando...' : 'Recusar'}
                    </button>
                    <button 
                      onClick={handleApprove} 
                      disabled={isUpdating}
                      className="w-full sm:w-auto h-14 px-10 bg-zinc-900 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
                    >
                      {isUpdating ? 'Processando...' : 'Aprovar e Continuar'}
                    </button>
                  </div>
                ) : proposta.status === 'aprovada' ? (
                  <div className="flex flex-col items-center">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                      className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 border border-emerald-100"
                    >
                      <CheckCircle className="w-10 h-10" />
                    </motion.div>
                    <p className="text-zinc-900 font-bold text-2xl mb-8 tracking-tight">Proposta aprovada!</p>
                    <button 
                      onClick={() => setViewState('contract')} 
                      className="btn-primary"
                    >
                      Ver Contrato e Pagamento
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                      className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 border border-red-100"
                    >
                      <X className="w-10 h-10" />
                    </motion.div>
                    <p className="text-red-600 font-bold text-2xl tracking-tight">Proposta recusada.</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div 
              key="contract"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-4xl mx-auto pb-24"
            >
              <button 
                onClick={() => setViewState('proposal')} 
                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 mb-10 font-bold text-[10px] uppercase tracking-[0.2em] transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar para a Proposta
              </button>
              
              <h1 className="text-4xl font-bold text-zinc-900 mb-12 tracking-tight">Contrato e Pagamento</h1>
              
              {(proposta.contratoTexto || proposta.chavePix || proposta.linkPagamento) ? (
                <div className="space-y-12">
                  {proposta.contratoTexto && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-full bg-white p-10 md:p-20 rounded-xl border border-black/[0.05] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] relative overflow-hidden min-h-[800px] flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-2 bg-zinc-900" />
                        
                        <div className="flex justify-between items-start mb-16">
                          <div>
                            <h3 className="text-3xl font-bold text-zinc-900 tracking-tight">Contrato de Prestação de Serviços</h3>
                            <p className="text-zinc-400 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">ID: {proposta.id.split('-')[0].toUpperCase()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-zinc-900 font-bold text-sm">{new Date().toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>

                        <div className="prose prose-zinc max-w-none flex-1 font-serif text-base text-zinc-800 leading-relaxed whitespace-pre-wrap">
                          {proposta.contratoTexto}
                        </div>

                        <div className="mt-24 pt-12 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-16">
                          <div>
                            <div className="h-px bg-zinc-200 w-full mb-6" />
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">Contratada</p>
                            <p className="text-zinc-900 font-bold text-sm">{userConfig.nome || 'Sua Empresa'}</p>
                          </div>
                          <div>
                            <div className="h-px bg-zinc-200 w-full mb-6" />
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">Contratante</p>
                            <p className="text-zinc-900 font-bold text-sm">{proposta.cliente_nome}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-10">
                        <button 
                          onClick={() => alert('Gerando PDF...')}
                          className="h-12 px-8 bg-white border border-black/[0.05] text-zinc-900 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-50 transition-all shadow-sm"
                        >
                          <FileText className="w-4 h-4 inline-block mr-2" /> Baixar PDF
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {(proposta.chavePix || proposta.linkPagamento) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="apple-card p-10 md:p-16"
                    >
                      <h3 className="text-2xl font-bold text-zinc-900 mb-10 tracking-tight">Opções de Pagamento</h3>
                      <div className="grid gap-8 md:grid-cols-2">
                        {proposta.chavePix && (
                          <div className="bg-zinc-50/50 p-8 rounded-3xl border border-black/[0.03] flex flex-col items-center text-center group hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all duration-500">
                            <div className="w-16 h-16 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-black/10">
                              <DollarSign className="w-8 h-8" />
                            </div>
                            <h4 className="font-bold text-zinc-900 mb-3 text-xl tracking-tight">Chave PIX</h4>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-6 px-4 py-3 bg-white rounded-xl w-full border border-black/[0.03] break-all">{proposta.chavePix}</p>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(proposta.chavePix || '');
                                alert('Chave PIX copiada!');
                              }}
                              className="w-full h-12 bg-zinc-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all active:scale-[0.98]"
                            >
                              Copiar Chave
                            </button>
                          </div>
                        )}

                        {proposta.linkPagamento && (
                          <div className="bg-zinc-50/50 p-8 rounded-3xl border border-black/[0.03] flex flex-col items-center text-center group hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all duration-500">
                            <div className="w-16 h-16 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-black/10">
                              <FileCheck className="w-8 h-8" />
                            </div>
                            <h4 className="font-bold text-zinc-900 mb-3 text-xl tracking-tight">Link de Pagamento</h4>
                            <p className="text-zinc-500 text-sm font-medium mb-8">Pague de forma segura online via cartão ou boleto.</p>
                            <a 
                              href={proposta.linkPagamento}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full h-12 flex items-center justify-center bg-zinc-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all active:scale-[0.98]"
                            >
                              Acessar Link
                            </a>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="text-center py-24 apple-card">
                  <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">Nenhuma informação de contrato ou pagamento configurada.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Identificação (Cadastro Prévio) */}
        <AnimatePresence>
          {showIdentification && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIdentification(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-black/[0.05]"
              >
                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-black/[0.03]">
                    <Users className="w-10 h-10 text-zinc-900" />
                  </div>
                  <h3 className="text-3xl font-bold text-zinc-900 tracking-tight">Identificação</h3>
                  <p className="text-zinc-500 text-sm mt-3 font-medium leading-relaxed">Para prosseguir com a assinatura, precisamos de alguns dados adicionais para o contrato.</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3 ml-1">Nome Completo</label>
                    <input 
                      type="text"
                      value={clientData.nome}
                      onChange={e => setClientData({...clientData, nome: e.target.value})}
                      className="glass-input"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3 ml-1">E-mail</label>
                    <input 
                      type="email"
                      value={clientData.email}
                      onChange={e => setClientData({...clientData, email: e.target.value})}
                      className="glass-input"
                      placeholder="exemplo@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3 ml-1">CPF ou CNPJ</label>
                    <input 
                      type="text"
                      value={clientData.documento}
                      onChange={e => setClientData({...clientData, documento: e.target.value})}
                      className="glass-input"
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>

                <div className="mt-12 flex flex-col gap-4">
                  <button 
                    onClick={handleApprove}
                    disabled={isUpdating || !clientData.nome || !clientData.email || !clientData.documento}
                    className="w-full h-14 bg-zinc-900 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
                  >
                    {isUpdating ? 'Processando...' : 'Confirmar e Assinar'}
                  </button>
                  <button 
                    onClick={() => setShowIdentification(false)}
                    className="w-full py-2 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-zinc-900 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

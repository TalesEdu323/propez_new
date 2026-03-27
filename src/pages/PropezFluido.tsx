import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Check, Save, FileText, User, DollarSign, LayoutTemplate, Layers, CheckCircle, Mail, ArrowRight, Eye, Plus } from 'lucide-react';
import { store, Cliente, Proposta, ModeloProposta, Servico } from '../lib/store';
import Builder from '../components/Builder';
import ContractEditor from '../components/ContractEditor';
import { fetchClientsFromCRM, ExternalClient, updateProposalStatusInCRM } from '../services/crmApi';

export default function PropezFluido({ navigate, initialData }: { navigate: (route: string, params?: any) => void, initialData?: any }) {
  const [step, setStep] = useState(1);
  const [createdPropostaId, setCreatedPropostaId] = useState<string>('');
  const [clientes, setClientes] = useState<Cliente[]>(store.getClientes());
  const [modelos] = useState<ModeloProposta[]>(store.getModelos());
  const [servicosDisponiveis] = useState<Servico[]>(store.getServicos());
  const [isFetchingCRM, setIsFetchingCRM] = useState(false);
  const [userConfig] = useState(() => store.getUserConfig());
  
  const [formData, setFormData] = useState({
    modeloId: '',
    clienteId: '',
    clienteNome: '',
    clienteEmail: '',
    servicos: [] as string[],
    valor: '',
    desconto: '',
    recorrente: false,
    cicloRecorrencia: 'mensal',
    duracaoRecorrencia: '12',
    envio: new Date().toISOString().split('T')[0],
    validade: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    elementos: [] as any[],
    contratoTexto: '',
    contratoId: '',
    chavePix: '',
    linkPagamento: ''
  });

  const [contratos] = useState(store.getContratos());

  useEffect(() => {
    if (initialData?.editId) {
      const prop = store.getPropostas().find(p => p.id === initialData.editId);
      if (prop) {
        setFormData(prev => ({
          ...prev,
          modeloId: prop.modelo_id || '',
          clienteId: prop.cliente_id,
          clienteNome: prop.cliente_nome,
          servicos: prop.servicos || [],
          valor: prop.valor.toString(),
          desconto: prop.desconto?.toString() || '',
          recorrente: prop.recorrente || false,
          cicloRecorrencia: prop.ciclo_recorrencia || 'mensal',
          duracaoRecorrencia: prop.duracao_recorrencia?.toString() || '12',
          envio: prop.data_envio || prev.envio,
          validade: prop.data_validade || prev.validade,
          elementos: prop.elementos || [],
          contratoTexto: prop.contratoTexto || '',
          contratoId: prop.contratoId || '',
          chavePix: prop.chavePix || '',
          linkPagamento: prop.linkPagamento || ''
        }));
        setStep(2); // Skip template selection if editing
      }
    }
  }, [initialData]);

  const handleModeloSelect = (modeloId: string) => {
    const modelo = modelos.find(m => m.id === modeloId);
    if (modelo) {
      const totalValor = modelo.servicos.reduce((acc, servicoId) => {
        const servico = servicosDisponiveis.find(s => s.id === servicoId);
        return acc + (servico ? servico.valor : 0);
      }, 0);

      setFormData(prev => ({
        ...prev,
        modeloId,
        servicos: modelo.servicos,
        valor: totalValor.toString(),
        elementos: modelo.elementos,
        contratoTexto: modelo.contratoTexto || '',
        contratoId: modelo.contratoId || '',
        chavePix: modelo.chavePix || '',
        linkPagamento: modelo.linkPagamento || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        modeloId: '',
        servicos: [],
        valor: '',
        elementos: [],
        contratoTexto: '',
        chavePix: '',
        linkPagamento: ''
      }));
    }
  };

  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const client = clientes.find(c => c.id === id);
    if (client) {
      setFormData({ ...formData, clienteId: id, clienteNome: client.nome, clienteEmail: client.email });
    } else {
      setFormData({ ...formData, clienteId: '', clienteNome: '', clienteEmail: '' });
    }
  };

  const handleImportFromProSync = async () => {
    setIsFetchingCRM(true);
    try {
      const prosyncClients = await fetchClientsFromCRM();
      // Em uma implementação real, você poderia abrir um modal para selecionar.
      // Aqui vamos apenas pegar o primeiro para demonstrar o preenchimento.
      if (prosyncClients.length > 0) {
        const lead = prosyncClients[0];
        setFormData({
          ...formData,
          clienteId: lead.id,
          clienteNome: lead.name,
          clienteEmail: lead.email
        });
        alert(`Dados do lead "${lead.name}" importados do ProSync com sucesso!`);
      }
    } catch (error) {
      console.error('Erro ao importar do ProSync:', error);
    } finally {
      setIsFetchingCRM(false);
    }
  };

  const replaceString = (str: string) => {
    if (typeof str !== 'string') return str;
    const servicosNomes = formData.servicos.map(id => servicosDisponiveis.find(s => s.id === id)?.nome).filter(Boolean).join(', ');
    const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(formData.valor) || 0);
    const descontoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(formData.desconto) || 0);

    return str
      .replace(/\{\{cliente_nome\}\}/gi, formData.clienteNome || '[Nome do Cliente]')
      .replace(/\{\{CLIENTE_NOME\}\}/gi, formData.clienteNome || '[Nome do Cliente]')
      .replace(/\{\{cliente_email\}\}/gi, formData.clienteEmail || '[E-mail do Cliente]')
      .replace(/\{\{cliente_empresa\}\}/gi, '[Empresa do Cliente]')
      .replace(/\{\{CLIENTE_EMPRESA\}\}/gi, '[Empresa do Cliente]')
      .replace(/\{\{valor_total\}\}/gi, valorFormatado)
      .replace(/\{\{VALOR_TOTAL\}\}/gi, valorFormatado)
      .replace(/\{\{desconto\}\}/gi, descontoFormatado)
      .replace(/\{\{data_envio\}\}/gi, new Date(formData.envio).toLocaleDateString('pt-BR'))
      .replace(/\{\{data_validade\}\}/gi, new Date(formData.validade).toLocaleDateString('pt-BR'))
      .replace(/\{\{DATA_ATUAL\}\}/gi, new Date().toLocaleDateString('pt-BR'))
      .replace(/\{\{servicos_lista\}\}/gi, servicosNomes || '[Lista de Serviços]')
      .replace(/\{\{SERVICOS_LISTA\}\}/gi, servicosNomes || '[Lista de Serviços]')
      .replace(/\{\{EMPRESA_NOME\}\}/gi, userConfig.nome || '[Sua Empresa]')
      .replace(/\{\{EMPRESA_CNPJ\}\}/gi, userConfig.cnpj || '[Seu CNPJ]')
      .replace(/\{\{ASSINATURA_IMAGEM\}\}/gi, userConfig.assinatura ? `<img src="${userConfig.assinatura}" style="max-height: 80px;" />` : '[Assinatura]');
  };

  const replaceVariables = (elements: any[]) => {
    const processElements = (els: any[]): any[] => {
      return els.map(el => {
        const newProps = { ...el.props };
        for (const key in newProps) {
          if (typeof newProps[key] === 'string') {
            newProps[key] = replaceString(newProps[key]);
          }
        }
        return {
          ...el,
          props: newProps,
          children: el.children ? processElements(el.children) : undefined
        };
      });
    };

    return processElements(elements);
  };

  const handleSave = (finalElements: any[]) => {
    const newPropostaId = initialData?.editId || Math.random().toString(36).substr(2, 9);
    const finalContractText = replaceString(formData.contratoTexto);

    const newProposta: Proposta = {
      id: newPropostaId,
      cliente_id: formData.clienteId || 'novo',
      cliente_nome: formData.clienteNome,
      modelo_id: formData.modeloId,
      servicos: formData.servicos,
      valor: Number(formData.valor),
      desconto: Number(formData.desconto) || 0,
      recorrente: formData.recorrente,
      ciclo_recorrencia: formData.cicloRecorrencia,
      duracao_recorrencia: Number(formData.duracaoRecorrencia) || 0,
      data_envio: formData.envio,
      data_validade: formData.validade,
      status: 'pendente',
      data_criacao: new Date().toISOString(),
      elementos: finalElements,
      contratoTexto: finalContractText,
      contratoId: formData.contratoId || undefined,
      chavePix: formData.chavePix,
      linkPagamento: formData.linkPagamento,
      pago: false
    };

    const propostas = store.getPropostas();
    let updated;
    if (initialData?.editId) {
      updated = propostas.map(p => p.id === newProposta.id ? newProposta : p);
    } else {
      updated = [...propostas, newProposta];
    }
    
    store.savePropostas(updated);
    
    // Sincronizar com o ProSync se o cliente veio de lá
    if (formData.clienteId.startsWith('prosync-')) {
      updateProposalStatusInCRM({
        proposalId: newPropostaId,
        crmClientId: formData.clienteId,
        status: 'pendente',
        value: Number(formData.valor),
        updatedAt: new Date().toISOString(),
        proposalUrl: `${window.location.origin}/?route=visualizar-proposta&id=${newPropostaId}`
      });
    }
    
    if (!formData.clienteId && formData.clienteNome) {
      const newCliente: Cliente = {
        id: newProposta.cliente_id,
        nome: formData.clienteNome,
        empresa: '',
        email: formData.clienteEmail || '',
        telefone: '',
        data_cadastro: new Date().toISOString()
      };
      store.saveClientes([...clientes, newCliente]);
    }

    setCreatedPropostaId(newPropostaId);
    setStep(6);
  };

  const [isSending, setIsSending] = useState(false);

  const steps = [
    { id: 1, title: 'Modelo Base', desc: 'Escolha um ponto de partida' },
    { id: 2, title: 'Cliente', desc: 'Para quem é esta proposta?' },
    { id: 3, title: 'Serviços & Valores', desc: 'O que está sendo oferecido' },
    { id: 4, title: 'Visual Builder', desc: 'Personalize sua proposta' },
    { id: 5, title: 'Contrato', desc: 'Termos e condições legais' },
  ];

  if (step === 6) {
    const handleSendEmail = async () => {
      if (!formData.clienteEmail) {
        alert('Preencha o e-mail do cliente.');
        return;
      }
      setIsSending(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert(`Proposta enviada com sucesso para ${formData.clienteEmail}! (Simulação)`);
        navigate('propostas');
      } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão ao tentar enviar o e-mail.');
      } finally {
        setIsSending(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#f5f5f4] flex flex-col items-center justify-center py-8 px-[7px] font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-black/5"
        >
          <div className="bg-[#0a0a0a] p-6 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_0%,#ffffff_0%,transparent_70%)]" />
            <div className="relative z-10">
              <div className="w-24 h-24 bg-white/10 text-white rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h2 className="text-4xl font-semibold text-white mb-4 tracking-tight">Proposta Gerada!</h2>
              <p className="text-white/70 text-lg max-w-md mx-auto">Sua proposta foi compilada com sucesso e o link de acesso já está disponível.</p>
            </div>
          </div>
          
          <div className="p-6 md:p-12 space-y-10">
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Link de Acesso Exclusivo</label>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}/?route=visualizar-proposta&id=${createdPropostaId}`}
                  className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm font-mono text-zinc-600 focus:outline-none"
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?route=visualizar-proposta&id=${createdPropostaId}`);
                    alert('Link copiado!');
                  }}
                  className="bg-[#0a0a0a] text-white hover:bg-zinc-800 rounded-xl px-8 py-4 text-sm font-medium transition-all active:scale-[0.98] whitespace-nowrap"
                >
                  Copiar Link
                </button>
              </div>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/10"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Envio Direto</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">E-mail do Cliente</label>
              <div className="flex gap-3">
                <input 
                  type="email" 
                  value={formData.clienteEmail}
                  onChange={e => setFormData({...formData, clienteEmail: e.target.value})}
                  placeholder="cliente@email.com"
                  className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
                <button 
                  onClick={handleSendEmail}
                  disabled={isSending}
                  className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl px-8 py-4 text-sm font-medium transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  <Mail className="w-4 h-4" />
                  {isSending ? 'Enviando...' : 'Enviar Agora'}
                </button>
              </div>
            </div>

            <div className="pt-8 border-t border-black/5 flex justify-between items-center">
              <button 
                onClick={() => navigate('visualizar-proposta', { id: createdPropostaId })}
                className="text-sm font-medium text-zinc-900 hover:text-blue-600 transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" /> Visualizar Proposta
              </button>
              <button 
                onClick={() => navigate('propostas')}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Ir para o Dashboard
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#F5F5F7] overflow-hidden font-sans">
      {/* Left Panel - Progress & Summary */}
      <div className="w-[32%] min-w-[360px] max-w-[440px] bg-zinc-900 text-white p-12 flex flex-col justify-between relative overflow-hidden hidden md:flex">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-zinc-700 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-1/2 -right-32 w-80 h-80 bg-zinc-800 rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10">
          <button 
            onClick={() => navigate('propostas')} 
            className="flex items-center gap-2 text-white/30 hover:text-white transition-all text-[10px] font-bold uppercase tracking-[0.25em] mb-20 group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Voltar
          </button>
          
          <h1 className="text-5xl font-semibold tracking-tightest mb-6 leading-none">
            {initialData?.editId ? 'Editar.' : 'Criar.'}
          </h1>
          <p className="text-white/40 text-sm mb-20 leading-relaxed max-w-[300px] font-medium">
            Configure os detalhes passo a passo para gerar uma proposta matadora e profissional.
          </p>
          
          {/* Vertical Stepper */}
          <div className="space-y-12">
            {steps.map((s) => (
              <div key={s.id} className="flex items-start gap-6 group cursor-default">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-700 ${
                  step > s.id ? 'bg-white border-white text-black' : 
                  step === s.id ? 'border-white text-white shadow-[0_0_30px_rgba(255,255,255,0.15)]' : 'border-white/10 text-white/10'
                }`}>
                  {step > s.id ? <Check className="w-5 h-5" /> : <span className="text-[10px] font-bold">{s.id}</span>}
                </div>
                <div className={`pt-1.5 transition-all duration-500 ${step >= s.id ? 'opacity-100' : 'opacity-20'}`}>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2">{s.title}</h3>
                  <p className="text-[11px] text-white/40 font-medium tracking-tight">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="relative z-10">
          {/* Live Summary */}
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-3xl shadow-2xl">
            <h4 className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/20 mb-8">Resumo da Proposta</h4>
            <div className="space-y-6 text-sm">
              <div className="flex justify-between items-center border-b border-white/5 pb-5">
                <span className="text-white/30 font-medium">Cliente</span>
                <span className="font-semibold text-right max-w-[160px] truncate tracking-tight">{formData.clienteNome || '-'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-5">
                <span className="text-white/30 font-medium">Serviços</span>
                <span className="font-semibold tracking-tight">{formData.servicos.length} itens</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-white/30 font-medium">Investimento</span>
                <span className="font-bold text-2xl text-white tracking-tightest">
                  {formData.valor ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(formData.valor)) : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Form */}
      <div className="flex-1 bg-[#F5F5F7] h-full overflow-y-auto relative flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-black/[0.05] flex flex-col gap-4 sticky top-0 bg-white/80 backdrop-blur-2xl z-20">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('propostas')} className="p-2 -ml-2 text-zinc-500">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Passo {step} de 5</span>
            <div className="w-9" />
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(step / 5) * 100}%` }}
              className="h-full bg-zinc-900"
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="flex-1 w-full max-w-4xl mx-auto py-12 px-6 md:py-24 md:px-20 flex flex-col">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-12">
                    <h2 className="text-4xl font-semibold text-zinc-900 mb-3 tracking-tight">Escolha um Modelo Base</h2>
                    <p className="text-zinc-500 text-lg">Selecione um template para preencher automaticamente os serviços, valores e o design da proposta.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <motion.div 
                      whileHover={{ y: -4 }}
                      onClick={() => {
                        handleModeloSelect('');
                        setStep(2);
                      }}
                      className={`p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center text-center min-h-[220px] shadow-sm ${
                        formData.modeloId === '' 
                          ? 'border-zinc-900 bg-white shadow-xl shadow-zinc-900/5' 
                          : 'border-transparent bg-white hover:border-zinc-200'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-6">
                        <Plus className="w-8 h-8 text-zinc-900" />
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-900">Começar do Zero</h3>
                      <p className="text-sm text-zinc-500 mt-2">Criar uma proposta em branco</p>
                    </motion.div>

                    {modelos.map(m => (
                      <motion.div 
                        key={m.id}
                        whileHover={{ y: -4 }}
                        onClick={() => {
                          handleModeloSelect(m.id);
                          setStep(2);
                        }}
                        className={`p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 flex flex-col min-h-[220px] shadow-sm ${
                          formData.modeloId === m.id 
                            ? 'border-zinc-900 bg-white shadow-xl shadow-zinc-900/5' 
                            : 'border-transparent bg-white hover:border-zinc-200'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center mb-auto">
                          <LayoutTemplate className="w-7 h-7 text-zinc-900" />
                        </div>
                        <div className="mt-8">
                          <h3 className="text-lg font-semibold text-zinc-900">{m.nome}</h3>
                          <p className="text-sm text-zinc-500 mt-1">{m.servicos.length} serviços inclusos</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
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
                        onClick={handleImportFromProSync}
                        disabled={isFetchingCRM}
                        className="bg-white text-zinc-900 border border-black/[0.05] hover:bg-zinc-50 rounded-2xl px-8 py-4 text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                      >
                        <Layers className={`w-4 h-4 ${isFetchingCRM ? 'animate-spin' : ''}`} />
                        {isFetchingCRM ? 'Buscando...' : 'Importar do ProSync'}
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
                          onChange={e => setFormData({...formData, clienteNome: e.target.value, clienteId: ''})}
                          placeholder="Ex: João Silva"
                          className="w-full bg-white border border-black/[0.05] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all shadow-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-[0.2em]">E-mail do Cliente</label>
                        <input 
                          type="email" 
                          value={formData.clienteEmail}
                          onChange={e => setFormData({...formData, clienteEmail: e.target.value, clienteId: ''})}
                          placeholder="Ex: joao@empresa.com"
                          className="w-full bg-white border border-black/[0.05] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-12">
                    <h2 className="text-4xl font-semibold text-zinc-900 mb-3 tracking-tight">Serviços e Valores</h2>
                    <p className="text-zinc-500 text-lg">Defina o escopo e o investimento necessário.</p>
                  </div>
                  
                  <div className="space-y-12">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-5 uppercase tracking-[0.2em]">Serviços Inclusos *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {servicosDisponiveis.length === 0 ? (
                          <div className="col-span-full text-sm text-zinc-400 text-center p-12 bg-white rounded-[2rem] border border-black/[0.05] shadow-sm">Nenhum serviço cadastrado.</div>
                        ) : (
                          servicosDisponiveis.map(servico => (
                            <label key={servico.id} className={`flex items-center gap-4 cursor-pointer p-5 rounded-2xl border transition-all duration-300 ${
                              formData.servicos.includes(servico.id) 
                                ? 'border-zinc-900 bg-white shadow-lg shadow-zinc-900/5' 
                                : 'border-transparent bg-white hover:border-zinc-200 shadow-sm'
                            }`}>
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                formData.servicos.includes(servico.id) ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-200'
                              }`}>
                                {formData.servicos.includes(servico.id) && <Check className="w-4 h-4 text-white" />}
                              </div>
                              <input 
                                type="checkbox"
                                checked={formData.servicos.includes(servico.id)}
                                onChange={() => {
                                  const newServicos = formData.servicos.includes(servico.id)
                                    ? formData.servicos.filter(id => id !== servico.id)
                                    : [...formData.servicos, servico.id];
                                  
                                  const totalValor = newServicos.reduce((acc, servicoId) => {
                                    const s = servicosDisponiveis.find(s => s.id === servicoId);
                                    return acc + (s ? s.valor : 0);
                                  }, 0);

                                  let newContratoId = formData.contratoId;
                                  let newContratoTexto = formData.contratoTexto;

                                  if (!formData.contratoId && !formData.modeloId) {
                                    const servicoComContrato = servicosDisponiveis.find(s => newServicos.includes(s.id) && s.contratoId);
                                    if (servicoComContrato) {
                                      const template = contratos.find(c => c.id === servicoComContrato.contratoId);
                                      if (template) {
                                        newContratoId = template.id;
                                        newContratoTexto = template.texto;
                                      }
                                    }
                                  }

                                  setFormData({
                                    ...formData, 
                                    servicos: newServicos, 
                                    valor: totalValor.toString(),
                                    contratoId: newContratoId,
                                    contratoTexto: newContratoTexto
                                  });
                                }}
                                className="hidden"
                              />
                              <div className="flex-1">
                                <span className="block text-sm font-semibold text-zinc-900">{servico.nome}</span>
                                <span className="block text-xs text-zinc-500 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servico.valor)}</span>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-white p-8 rounded-[2.5rem] border border-black/[0.05] shadow-xl shadow-black/[0.02]">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-[0.2em]">Valor Total (R$) *</label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">R$</span>
                          <input 
                            type="number" 
                            value={formData.valor}
                            onChange={e => setFormData({...formData, valor: e.target.value})}
                            placeholder="0.00"
                            step="0.01"
                            className="w-full bg-zinc-50 border-transparent rounded-2xl pl-14 pr-5 py-5 text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all tracking-tight"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-[0.2em]">Desconto (R$)</label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">R$</span>
                          <input 
                            type="number" 
                            value={formData.desconto}
                            onChange={e => setFormData({...formData, desconto: e.target.value})}
                            placeholder="0.00"
                            step="0.01"
                            className="w-full bg-zinc-50 border-transparent rounded-2xl pl-14 pr-5 py-5 text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all tracking-tight text-emerald-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-[0.2em]">Chave PIX (Opcional)</label>
                        <input
                          type="text"
                          value={formData.chavePix}
                          onChange={(e) => setFormData({...formData, chavePix: e.target.value})}
                          className="w-full bg-white border border-black/[0.05] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all shadow-sm"
                          placeholder="CNPJ, Email, Telefone..."
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-[0.2em]">Link de Pagamento (Opcional)</label>
                        <input
                          type="url"
                          value={formData.linkPagamento}
                          onChange={(e) => setFormData({...formData, linkPagamento: e.target.value})}
                          className="w-full bg-white border border-black/[0.05] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all shadow-sm"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full flex flex-col"
                >
                  <div className="mb-8">
                    <h2 className="text-3xl font-semibold text-zinc-900 mb-2 tracking-tight">Personalização Visual</h2>
                    <p className="text-zinc-500">Ajuste o design e os elementos da sua proposta.</p>
                  </div>
                  
                  <div className="flex-1 border border-black/5 rounded-3xl overflow-hidden bg-white shadow-2xl min-h-[600px]">
                    <Builder 
                      initialElements={formData.elementos} 
                      onChange={(els) => setFormData({...formData, elementos: els})} 
                      previewMode={false}
                    />
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full flex flex-col"
                >
                  <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-semibold text-zinc-900 mb-2 tracking-tight">Prazos e Contrato</h2>
                      <p className="text-zinc-500">Configure as datas, recorrência e termos legais.</p>
                    </div>

                    <div className="w-full sm:w-64">
                      <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">Trocar Template de Contrato</label>
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
                            });
                          }
                        }}
                        className="w-full bg-zinc-50 border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                      >
                        <option value="">Personalizado / Conforme Modelo</option>
                        {contratos.map(c => (
                          <option key={c.id} value={c.id}>{c.titulo}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-8 mb-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Data de Envio</label>
                        <input 
                          type="date" 
                          value={formData.envio}
                          onChange={e => setFormData({...formData, envio: e.target.value})}
                          className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Validade da Proposta</label>
                        <input 
                          type="date" 
                          value={formData.validade}
                          onChange={e => setFormData({...formData, validade: e.target.value})}
                          className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                        />
                      </div>
                    </div>

                    <div className="bg-zinc-50 p-6 rounded-3xl border border-black/5">
                      <label className="flex items-center gap-4 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.recorrente}
                          onChange={e => setFormData({...formData, recorrente: e.target.checked})}
                          className="w-5 h-5 text-black rounded border-black/20 focus:ring-black accent-black"
                        />
                        <span className="text-sm font-semibold text-zinc-900">Este é um serviço recorrente (assinatura)</span>
                      </label>

                      <AnimatePresence>
                        {formData.recorrente && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-hidden"
                          >
                            <div>
                              <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Ciclo de Cobrança</label>
                              <select 
                                value={formData.cicloRecorrencia}
                                onChange={e => setFormData({...formData, cicloRecorrencia: e.target.value})}
                                className="w-full bg-white border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none"
                              >
                                <option value="semanal">Semanal</option>
                                <option value="mensal">Mensal</option>
                                <option value="trimestral">Trimestral</option>
                                <option value="semestral">Semestral</option>
                                <option value="anual">Anual</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Duração (Meses)</label>
                              <input 
                                type="number" 
                                value={formData.duracaoRecorrencia}
                                onChange={e => setFormData({...formData, duracaoRecorrencia: e.target.value})}
                                placeholder="Ex: 12"
                                className="w-full bg-white border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-h-[600px] border border-black/5 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-zinc-50 px-4 py-2 border-b border-black/5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Confirmação dos Termos</span>
                      <span className="text-[10px] text-zinc-400 italic">As variáveis serão substituídas automaticamente na visualização final</span>
                    </div>
                    <ContractEditor 
                      value={formData.contratoTexto}
                      onChange={(val) => setFormData({...formData, contratoTexto: val})}
                    />
                  </div>
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
                if (step === 2 && !formData.clienteNome) {
                  alert('Preencha o nome do cliente.');
                  return;
                }
                if (step === 3 && (!formData.servicos.length || !formData.valor)) {
                  alert('Selecione pelo menos um serviço e preencha o valor.');
                  return;
                }
                if (step === 5 && (!formData.envio || !formData.validade)) {
                  alert('Preencha as datas de envio e validade.');
                  return;
                }
                
                if (step === 5) {
                  // Directly generate proposal using template elements with replaced variables
                  handleSave(replaceVariables(formData.elementos));
                } else {
                  setStep(step + 1);
                }
              }}
              className="bg-[#0a0a0a] text-white hover:bg-zinc-800 rounded-xl px-8 py-4 text-sm font-medium transition-all active:scale-[0.98] flex items-center gap-2 shadow-lg shadow-black/10"
            >
              {step === 5 ? 'Gerar Proposta' : 'Próximo Passo'}
              {step !== 5 && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

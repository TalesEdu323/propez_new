import React, { useState, useEffect } from 'react';
import { 
  FileText, Users, CheckCircle, TrendingUp, Plus, Wallet, 
  Clock, Activity, ChevronRight, DollarSign, ArrowUpRight,
  Target, Zap, BarChart3, Calendar as CalendarIcon,
  ArrowRight
} from 'lucide-react';
import { store } from '../lib/store';
import { motion } from 'motion/react';

export default function Dashboard({ navigate }: { navigate: (route: string, params?: any) => void }) {
  const propostas = store.getPropostas();
  const clientes = store.getClientes();
  const servicos = store.getServicos();

  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    setCurrentDate(new Date().toLocaleDateString('pt-BR', options));
  }, []);

  const getServicosNomes = (ids: string[]) => {
    if (!ids || ids.length === 0) return 'Nenhum serviço';
    const nomes = ids.map(id => servicos.find(s => s.id === id)?.nome).filter(Boolean);
    return nomes.length > 0 ? nomes.join(', ') : 'Serviços não encontrados';
  };

  const totalRevenue = propostas
    .filter(p => p.status === 'aprovada')
    .reduce((acc, curr) => acc + curr.valor, 0);

  const totalPaid = propostas
    .filter(p => p.pago)
    .reduce((acc, curr) => acc + curr.valor, 0);

  const totalPending = propostas
    .filter(p => p.status === 'aprovada' && !p.pago)
    .reduce((acc, curr) => acc + curr.valor, 0);

  const conversionRate = propostas.length > 0 
    ? Math.round((propostas.filter(p => p.status === 'aprovada').length / propostas.length) * 100) 
    : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } }
  };

  return (
    <div className="min-h-full bg-[#F5F5F7] font-sans selection:bg-zinc-200">
      <div className="page-container">
        
        {/* Header Section: Refined & Elegant */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1.5"
          >
            <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-semibold uppercase tracking-[0.15em]">
              <CalendarIcon className="w-3.5 h-3.5" />
              {currentDate}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight">
              {greeting}, <span className="text-zinc-400 font-medium">Pronto para decolar?</span>
            </h1>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <button 
              onClick={() => navigate('propez-fluido')}
              className="group relative flex items-center justify-center gap-2 bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all hover:bg-zinc-800 hover:shadow-2xl hover:shadow-zinc-900/20 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
              <span>Nova Proposta</span>
            </button>
          </motion.div>
        </header>

        {/* Main Bento Grid */}
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show" 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-8"
        >
          
          {/* Hero Metric: Revenue Overview */}
          <motion.div 
            variants={itemVariants} 
            className="md:col-span-2 lg:col-span-8 apple-card p-6 sm:p-8 md:p-12 flex flex-col justify-between relative overflow-hidden group min-h-[380px] sm:min-h-[420px] apple-card-hover"
          >
            <div className="absolute -right-20 -top-20 w-96 h-96 bg-zinc-50 rounded-full blur-[100px] opacity-60 group-hover:bg-zinc-100 transition-colors duration-700" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-16">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-2xl shadow-zinc-900/20">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.25em] block mb-0.5">Faturamento Total</span>
                  <span className="text-sm font-medium text-zinc-500">Propostas aprovadas e liquidadas</span>
                </div>
              </div>
              
              <div className="space-y-6">
                <h2 className="text-6xl md:text-8xl font-bold text-zinc-900 tracking-tightest">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalRevenue)}
                </h2>
                <div className="flex items-center gap-3 w-fit bg-emerald-50/50 text-emerald-600 px-5 py-2.5 rounded-full border border-emerald-100/50 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">{conversionRate}% de Conversão</span>
                </div>
              </div>
            </div>

            <div className="mt-12 sm:mt-16 grid grid-cols-3 gap-4 sm:gap-10 border-t border-zinc-100 pt-8 sm:pt-12 relative z-10">
              <div className="space-y-1 sm:space-y-2">
                <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Clientes</p>
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">{clientes.length}</p>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Serviços</p>
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">{servicos.length}</p>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Propostas</p>
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">{propostas.length}</p>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Column */}
          <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
            {/* Metric: Received */}
            <motion.div 
              variants={itemVariants} 
              onClick={() => navigate('pagamentos')}
              className="apple-card p-8 flex flex-col justify-between cursor-pointer apple-card-hover group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:text-zinc-900 group-hover:bg-zinc-100 transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Recebido</span>
                <h3 className="text-3xl font-bold text-zinc-900 tracking-tight mt-2">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPaid)}
                </h3>
              </div>
            </motion.div>

            {/* Metric: Pending */}
            <motion.div 
              variants={itemVariants} 
              onClick={() => navigate('pagamentos')}
              className="apple-card p-8 flex flex-col justify-between cursor-pointer apple-card-hover group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100/50">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:text-zinc-900 group-hover:bg-zinc-100 transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Pendente</span>
                <h3 className="text-3xl font-bold text-zinc-900 tracking-tight mt-2">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPending)}
                </h3>
              </div>
            </motion.div>

            {/* Quick Action: Services - Full width on sm/lg, but integrated */}
            <motion.div 
              variants={itemVariants} 
              onClick={() => navigate('servicos')}
              className="sm:col-span-2 lg:col-span-1 bg-zinc-900 rounded-[2.5rem] p-8 text-white flex flex-col justify-between cursor-pointer hover:bg-zinc-800 transition-all duration-500 group relative overflow-hidden shadow-2xl shadow-zinc-900/10"
            >
              <div className="absolute -right-6 -bottom-6 text-white/5 group-hover:scale-125 transition-transform duration-700">
                <Zap className="w-32 h-32" />
              </div>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-white/30 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-8">
                <h3 className="text-xl font-bold tracking-tight">Gerenciar Serviços</h3>
                <p className="text-white/50 text-sm mt-1 font-medium">Otimize seu catálogo de ofertas.</p>
              </div>
            </motion.div>
          </div>

          {/* Recent Activity: Full Width List */}
          <motion.div 
            variants={itemVariants} 
            className="md:col-span-2 lg:col-span-8 apple-card p-6 sm:p-8 md:p-12"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-900 border border-zinc-100 shadow-sm">
                  <Activity className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Atividade Recente</h2>
                  <p className="text-sm text-zinc-400 font-medium">Últimas propostas e interações comerciais</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('propostas')}
                className="px-6 py-3 rounded-2xl bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] hover:bg-zinc-100 hover:text-zinc-900 transition-all flex items-center justify-center gap-2 group border border-zinc-100/50"
              >
                Ver todas <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            {propostas.length === 0 ? (
              <div className="text-center py-20 sm:py-32 bg-zinc-50/30 rounded-[2rem] sm:rounded-[3rem] border border-dashed border-zinc-200">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-sm border border-zinc-100">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-200" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight mb-2">Sem atividade recente</h3>
                <p className="text-zinc-400 font-medium text-xs sm:text-sm mb-8 sm:mb-10">Sua jornada comercial começa aqui.</p>
                <button 
                  onClick={() => navigate('propez-fluido')}
                  className="btn-primary inline-flex scale-90 sm:scale-100"
                >
                  Criar sua primeira proposta
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {propostas.slice(0, 5).map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => navigate('propostas')}
                    className="flex items-center justify-between p-6 rounded-[2rem] bg-white hover:bg-zinc-50/80 transition-all duration-500 cursor-pointer group border border-zinc-100/50 hover:border-zinc-200 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-6 min-w-0">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-105 shadow-sm ${
                        p.status === 'aprovada' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' :
                        p.status === 'recusada' ? 'bg-red-50 text-red-600 border border-red-100/50' :
                        'bg-zinc-50 text-zinc-400 border border-zinc-100'
                      }`}>
                        {p.status === 'aprovada' ? <CheckCircle className="w-6 h-6" /> : 
                         p.status === 'recusada' ? <FileText className="w-6 h-6" /> : 
                         <Clock className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-zinc-900 tracking-tight truncate text-lg">{p.cliente_nome}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.15em] truncate max-w-[250px]">
                            {getServicosNomes(p.servicos)}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-zinc-200" />
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.15em]">
                            {new Date(p.data_criacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 shrink-0 ml-4">
                      <div className="text-right hidden sm:block">
                        <p className="font-bold text-zinc-900 tracking-tightest text-xl">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)}
                        </p>
                        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full inline-block mt-1 ${
                          p.status === 'aprovada' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100/50' :
                          p.status === 'recusada' ? 'text-red-600 bg-red-50 border border-red-100/50' :
                          'text-zinc-500 bg-zinc-100 border border-zinc-200/50'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:text-zinc-900 group-hover:bg-zinc-100 transition-all">
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick Actions Sidebar */}
          <div className="md:col-span-2 lg:col-span-4 space-y-6">
            <motion.div variants={itemVariants} className="apple-card p-8">
              <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.25em] mb-8">Ações Rápidas</h3>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => navigate('propez-fluido')}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-900 hover:text-white transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-zinc-900 group-hover:bg-white/10 group-hover:text-white transition-colors border border-zinc-100 group-hover:border-white/10">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">Nova Proposta</span>
                </button>
                <button 
                  onClick={() => navigate('clientes')}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-900 hover:text-white transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-zinc-900 group-hover:bg-white/10 group-hover:text-white transition-colors border border-zinc-100 group-hover:border-white/10">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">Adicionar Cliente</span>
                </button>
                <button 
                  onClick={() => navigate('servicos')}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-900 hover:text-white transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-zinc-900 group-hover:bg-white/10 group-hover:text-white transition-colors border border-zinc-100 group-hover:border-white/10">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">Novo Serviço</span>
                </button>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="apple-card p-8 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
              <div className="relative z-10">
                <Target className="w-8 h-8 text-white/20 mb-6" />
                <h3 className="text-xl font-bold tracking-tight mb-2">Meta Mensal</h3>
                <p className="text-white/50 text-xs font-medium mb-6">Você atingiu 65% da sua meta de faturamento este mês.</p>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-white w-[65%] rounded-full" />
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                  <span>R$ 0</span>
                  <span>R$ 50k</span>
                </div>
              </div>
            </motion.div>
          </div>

        </motion.div>

        {/* Mobile Floating Action Button: Refined */}
        <div className="md:hidden fixed bottom-32 right-6 z-50">
          <button 
            onClick={() => navigate('propez-fluido')}
            className="w-16 h-16 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-zinc-900/40 active:scale-90 transition-all border border-white/10"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>

      </div>
    </div>
  );
}

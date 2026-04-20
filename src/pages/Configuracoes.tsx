import { useState, useEffect } from 'react';
import { 
  User, Building2, Shield, Bell, Download, 
  Smartphone, CheckCircle2, ChevronRight,
  Camera, CreditCard, HelpCircle, Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { store, resolvePlan } from '../lib/store';
import { PLAN_META } from '../lib/featureFlags';
import { usePWA } from '../lib/usePWA';
import type { NavigateFn } from '../types/navigation';

interface ConfiguracoesProps {
  navigate: NavigateFn;
}

export default function Configuracoes({ navigate }: ConfiguracoesProps) {
  const [userConfig, setUserConfig] = useState(() => store.getUserConfig());
  const { installPrompt, isInstalled, installApp } = usePWA();
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const plan = resolvePlan(userConfig);
  const planMeta = PLAN_META[plan];

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => setNotifications(data))
      .catch(err => console.error('Erro ao buscar notificações:', err));
  }, []);

  const handleGoToPlans = () => navigate('planos');

  const handleSave = () => {
    setIsSaving(true);
    store.saveUserConfig(userConfig);
    setTimeout(() => setIsSaving(false), 1000);
  };

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
        
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 tracking-tightest leading-none">Ajustes.</h1>
          <p className="text-zinc-400 mt-4 font-medium">Personalize sua experiência e gerencie sua conta.</p>
        </header>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          {/* Profile Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div variants={itemVariants} className="apple-card p-8 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="w-full h-full bg-zinc-100 rounded-[2rem] flex items-center justify-center text-zinc-300 border border-zinc-200/50">
                  <User className="w-10 h-10" />
                </div>
                <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{userConfig.nome || 'Seu Nome'}</h2>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">
                {plan !== 'free' ? (
                  <span className={`${planMeta.accentClass} flex items-center justify-center gap-1`}>
                    <Sparkles className="w-3 h-3" /> Plano {planMeta.name}
                  </span>
                ) : 'Plano Gratuito'}
              </p>

              {plan === 'free' ? (
                <button
                  onClick={handleGoToPlans}
                  className="mt-6 w-full bg-gradient-to-r from-amber-400 to-amber-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-amber-200"
                >
                  Ver planos e fazer upgrade
                </button>
              ) : (
                <button
                  onClick={handleGoToPlans}
                  className="mt-6 w-full bg-white border border-zinc-200 text-zinc-700 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all hover:border-zinc-900"
                >
                  Gerenciar plano
                </button>
              )}
              
              <div className="mt-8 pt-8 border-t border-zinc-100 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-zinc-900 tracking-tight">12</p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Propostas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-zinc-900 tracking-tight">08</p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Clientes</p>
                </div>
              </div>
            </motion.div>

            {/* PWA Install Card */}
            <motion.div variants={itemVariants} className="apple-card p-8 bg-zinc-900 text-white relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/10">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-2">PropEZ no seu Celular</h3>
                <p className="text-white/50 text-xs font-medium mb-8 leading-relaxed">
                  Instale o PropEZ como um aplicativo nativo para acesso rápido e offline.
                </p>
                
                {isInstalled ? (
                  <div className="flex items-center gap-3 text-emerald-400 bg-emerald-400/10 px-4 py-3 rounded-xl border border-emerald-400/20">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Já Instalado</span>
                  </div>
                ) : installPrompt ? (
                  <button 
                    onClick={installApp}
                    className="w-full bg-white text-zinc-900 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Instalar Agora
                  </button>
                ) : (
                  <div className="text-white/30 text-[9px] font-bold uppercase tracking-widest text-center border border-white/10 py-3 rounded-xl">
                    Abra no Chrome/Safari para instalar
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Settings Main */}
          <div className="lg:col-span-8 space-y-8">
            <motion.div variants={itemVariants} className="apple-card p-8 md:p-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-900 border border-zinc-100">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">Dados da Empresa</h3>
                  <p className="text-sm text-zinc-400 font-medium">Informações que aparecerão nas suas propostas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nome Fantasia</label>
                  <input 
                    type="text"
                    value={userConfig.nome}
                    onChange={(e) => setUserConfig({ ...userConfig, nome: e.target.value })}
                    className="glass-input px-5 py-4 text-sm font-medium"
                    placeholder="Ex: Minha Agência"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">CNPJ / CPF</label>
                  <input 
                    type="text"
                    value={userConfig.cnpj}
                    onChange={(e) => setUserConfig({ ...userConfig, cnpj: e.target.value })}
                    className="glass-input px-5 py-4 text-sm font-medium"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div className="mt-10 pt-10 border-t border-zinc-100 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary min-w-[160px]"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </motion.div>

            {/* Notifications Section */}
            <motion.div variants={itemVariants} className="apple-card p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">Notificações</h3>
                  <p className="text-sm text-zinc-400 font-medium">Fique por dentro das novidades</p>
                </div>
              </div>

              <div className="space-y-4">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div key={notif.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex gap-4 items-start">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{notif.title}</h4>
                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{notif.message}</p>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-2">
                          {new Date(notif.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-zinc-400 text-sm font-medium">
                    Nenhuma notificação por enquanto.
                  </div>
                )}
              </div>
            </motion.div>

            {/* Integrations Section */}
            <motion.div variants={itemVariants} className="apple-card p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-900 border border-zinc-100">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">Integrações</h3>
                  <p className="text-sm text-zinc-400 font-medium">Conecte o PropEZ com suas ferramentas favoritas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">PS</div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">ProSync CRM</h4>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Status: Conectado</p>
                    </div>
                  </div>
                  <button className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors">Configurar</button>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold">RB</div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">Rubrica Assinatura</h4>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Status: Aguardando Chave</p>
                    </div>
                  </div>
                  <button className="text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:text-amber-700 transition-colors">Conectar</button>
                </div>
              </div>
            </motion.div>

            {/* Other Settings Sections */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: <Shield className="w-5 h-5" />, title: 'Segurança', desc: 'Senha e autenticação', onClick: undefined as (() => void) | undefined },
                { icon: <Bell className="w-5 h-5" />, title: 'Notificações', desc: 'Alertas de propostas', onClick: undefined },
                { icon: <CreditCard className="w-5 h-5" />, title: 'Faturamento', desc: 'Planos e pagamentos', onClick: handleGoToPlans },
                { icon: <HelpCircle className="w-5 h-5" />, title: 'Suporte', desc: 'Central de ajuda', onClick: undefined },
              ].map((item, i) => (
                <div key={i} onClick={item.onClick} className="apple-card p-6 flex items-center justify-between group cursor-pointer apple-card-hover">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">{item.title}</h4>
                      <p className="text-[10px] text-zinc-400 font-medium">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

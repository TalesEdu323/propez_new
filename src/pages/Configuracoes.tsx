import { useCallback, useEffect, useState } from 'react';
import { 
  User, Building2, Shield, Bell, Download, 
  Smartphone, CheckCircle2, ChevronRight,
  Camera, CreditCard, HelpCircle, Sparkles, Palette
} from 'lucide-react';
import { motion } from 'motion/react';
import { store, resolvePlan } from '../lib/store';
import { PLAN_META, hasWhiteLabel } from '../lib/featureFlags';
import { ServiceRequestLauncher } from '../components/ServiceRequestLauncher';
import { usePWA } from '../lib/usePWA';
import type { NavigateFn } from '../types/navigation';
import {
  notificationTone,
  openNotificationAction,
  useNotifications,
} from '../lib/useNotifications';
import { api, ApiError } from '../lib/apiClient';
import type { OfferType } from '../lib/layoutContext';
import { SEGMENT_OPTIONS } from '../lib/segmentLabels';
import {
  IntegrationProviderCard,
  type IntegrationCredentialSummary,
} from './configuracoes/IntegrationProviderCard';
import SecuritySettingsPanel from '../components/settings/SecuritySettingsPanel';

interface ServiceRequestItem {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  adminNotes?: string | null;
}

interface IntegrationsCredentialsResponse {
  suiteEnabled: boolean;
  canSaveManual: boolean;
  prosync: IntegrationCredentialSummary;
}

interface ConfiguracoesProps {
  navigate: NavigateFn;
}

export default function Configuracoes({ navigate }: ConfiguracoesProps) {
  const [userConfig, setUserConfig] = useState(() => store.getUserConfig());
  const { installPrompt, isInstalled, installApp } = usePWA();
  const [isSaving, setIsSaving] = useState(false);
  const { items: notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [integrations, setIntegrations] = useState<IntegrationsCredentialsResponse | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [provisioning, setProvisioning] = useState<'prosync' | null>(null);
  const plan = resolvePlan(userConfig);
  const planMeta = PLAN_META[plan];
  const whiteLabelEnabled = hasWhiteLabel(userConfig);
  const [myRequests, setMyRequests] = useState<ServiceRequestItem[]>([]);
  const [showSecurity, setShowSecurity] = useState(false);

  const loadMyRequests = useCallback(async () => {
    try {
      const data = await api.get<ServiceRequestItem[]>('/api/requests/mine');
      setMyRequests(data);
    } catch {
      setMyRequests([]);
    }
  }, []);

  useEffect(() => {
    void loadMyRequests();
  }, [loadMyRequests]);

  const latestWhitelabelRequest = myRequests.find((r) => r.type === 'whitelabel');

  const loadIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    try {
      const data = await api.get<IntegrationsCredentialsResponse>('/api/integrations/credentials');
      setIntegrations(data);
    } catch (err) {
      console.error('[Configuracoes] credenciais indisponíveis:', err);
      setIntegrations(null);
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  const handleProvision = async (provider: 'prosync') => {
    setProvisioning(provider);
    try {
      await api.post(`/api/integrations/credentials/${provider}/provision`, {
        createIfMissing: true,
      });
      await loadIntegrations();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao conectar integração';
      alert(message);
    } finally {
      setProvisioning(null);
    }
  };

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
        
        <header className="mb-8">
          <h1 className="page-title font-bold">Ajustes.</h1>
          <p className="text-zinc-400 mt-2 text-sm font-medium">Personalize sua experiência e gerencie sua conta.</p>
        </header>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          {/* Profile Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div variants={itemVariants} className="apple-card p-6 text-center">
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
            <motion.div variants={itemVariants} className="apple-card p-6 bg-zinc-900 text-white relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/10">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-2">Propez no seu Celular</h3>
                <p className="text-white/50 text-xs font-medium mb-8 leading-relaxed">
                  Instale o Propez como um aplicativo nativo para acesso rápido e offline.
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
            <motion.div variants={itemVariants} className="apple-card p-6 md:p-7">
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
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nicho / Segmento</label>
                  <select
                    value={userConfig.segment ?? 'generico'}
                    onChange={(e) => setUserConfig({ ...userConfig, segment: e.target.value as OfferType })}
                    className="glass-input px-5 py-4 text-sm font-medium w-full"
                  >
                    {SEGMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-400 ml-1">Define o estilo visual das imagens geradas por IA nos modelos.</p>
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

            <motion.div variants={itemVariants} className="apple-card p-6 md:p-7">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
                  <Palette className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">Identidade visual</h3>
                  <p className="text-sm text-zinc-400 font-medium">
                    Marca personalizada no app e nas propostas públicas (gerenciada pela equipe Propez)
                  </p>
                </div>
              </div>

              {whiteLabelEnabled ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                      Whitelabel ativo
                    </p>
                    <div className="w-24 h-24 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center overflow-hidden">
                      {userConfig.logo ? (
                        <img src={userConfig.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <span className="text-2xl font-bold text-zinc-400">
                          {(userConfig.nome || 'O').charAt(0)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-600">Configurado pela equipe Propez.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cor principal</p>
                    <div className="flex items-center gap-3">
                      <span
                        className="w-10 h-10 rounded-xl border border-black/10"
                        style={{ backgroundColor: userConfig.primaryColor ?? '#18181b' }}
                      />
                      <span className="font-mono text-sm text-zinc-700">
                        {userConfig.primaryColor ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {latestWhitelabelRequest && (
                    <div
                      className={`p-4 rounded-2xl border text-sm ${
                        latestWhitelabelRequest.status === 'pending'
                          ? 'bg-amber-50 border-amber-100 text-amber-800'
                          : latestWhitelabelRequest.status === 'rejected'
                            ? 'bg-red-50 border-red-100 text-red-700'
                            : 'bg-zinc-50 border-zinc-100 text-zinc-600'
                      }`}
                    >
                      Solicitação {latestWhitelabelRequest.status === 'pending' ? 'em análise' : latestWhitelabelRequest.status === 'rejected' ? 'recusada' : 'processada'} —{' '}
                      {new Date(latestWhitelabelRequest.createdAt).toLocaleDateString('pt-BR')}
                      {latestWhitelabelRequest.adminNotes && (
                        <p className="mt-2 text-xs opacity-80">{latestWhitelabelRequest.adminNotes}</p>
                      )}
                    </div>
                  )}

                  <ServiceRequestLauncher type="whitelabel">
                    {({ open, loading }) => (
                      <button
                        type="button"
                        onClick={open}
                        disabled={loading || latestWhitelabelRequest?.status === 'pending'}
                        className="btn-primary"
                      >
                        {loading ? 'Carregando…' : 'Solicitar identidade visual'}
                      </button>
                    )}
                  </ServiceRequestLauncher>
                </div>
              )}
            </motion.div>

            {/* Notifications Section */}
            <motion.div variants={itemVariants} className="apple-card p-6">
              <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">Notificações</h3>
                    <p className="text-sm text-zinc-400 font-medium">
                      {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Propostas e contratos em tempo real'}
                    </p>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-900 uppercase tracking-widest"
                  >
                    Marcar todas
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((notif) => {
                    const tone = notificationTone(notif.type);
                    const dot =
                      tone === 'success'
                        ? 'bg-emerald-500'
                        : tone === 'danger'
                          ? 'bg-red-500'
                          : tone === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-zinc-400';
                    return (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => {
                          if (!notif.readAt) void markRead(notif.id);
                          if (notif.actionUrl) openNotificationAction(notif.actionUrl, navigate);
                        }}
                        className={`w-full text-left p-4 rounded-2xl border flex gap-4 items-start transition-all hover:border-zinc-300 ${
                          notif.readAt ? 'bg-white border-zinc-100' : 'bg-zinc-50 border-zinc-200 shadow-sm'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.readAt ? 'opacity-30' : dot}`} />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-zinc-900">{notif.title}</h4>
                          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{notif.message}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                              {new Date(notif.date).toLocaleString('pt-BR')}
                            </p>
                            {notif.actionLabel && notif.actionUrl && (
                              <span className="text-[10px] font-bold text-[#ff5200] uppercase tracking-widest flex items-center gap-1">
                                {notif.actionLabel}
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-zinc-400 text-sm font-medium">
                    Nenhuma notificação por enquanto.
                  </div>
                )}
              </div>
            </motion.div>

            {/* Integrations Section */}
            <motion.div variants={itemVariants} className="apple-card p-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-900 border border-zinc-100">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">Integrações</h3>
                  <p className="text-sm text-zinc-400 font-medium">Conecte o Propez com suas ferramentas favoritas</p>
                </div>
              </div>

              <p className="text-sm text-zinc-500 mb-4">
                Cada organização usa sua própria chave API do ProSync. Gere a chave no painel do ProSync
                e cole abaixo — não é necessário configurar no servidor (Vercel).
              </p>
              <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4">
                A assinatura digital de contratos é nativa no PropEZ (PDF + link de assinatura). Não é
                necessário integrar serviço externo.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <IntegrationProviderCard
                  provider="prosync"
                  title="ProSync CRM"
                  badge="PS"
                  badgeClass="bg-blue-50 text-blue-600"
                  defaultBaseUrl="https://prosync.tech"
                  keyPlaceholder="ps_live_..."
                  credential={integrations?.prosync}
                  suiteEnabled={integrations?.suiteEnabled ?? false}
                  canSaveManual={integrations?.canSaveManual ?? false}
                  loading={integrationsLoading}
                  provisioning={provisioning === 'prosync'}
                  onProvision={() => void handleProvision('prosync')}
                  onRefresh={loadIntegrations}
                />
              </div>
            </motion.div>

            {/* Other Settings Sections */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: <Shield className="w-5 h-5" />, title: 'Segurança', desc: 'Senha e autenticação', onClick: () => setShowSecurity(true) },
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
      {showSecurity && <SecuritySettingsPanel onClose={() => setShowSecurity(false)} />}
    </div>
  );
}

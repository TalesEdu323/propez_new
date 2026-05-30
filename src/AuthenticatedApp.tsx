import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Layers, Briefcase, Bell, DollarSign, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { hydrateStore, store } from './lib/store';
import { subscribeToPlanosRequest } from './lib/navigationEvents';
import type { AppRoute } from './types/navigation';
import { useAppNavigation } from './hooks/useAppNavigation';
import {
  logout as authLogout,
  useInitialLoaded,
  useSession,
} from './lib/authSession';
import { PropezLogo } from './components/PropezLogo';
import { AppTopBar, AppTopBarMobileButton } from './components/AppTopBar';
import { useNotifications } from './lib/useNotifications';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Propostas = lazy(() => import('./pages/Propostas'));
const Pagamentos = lazy(() => import('./pages/Pagamentos'));
const PropezFluido = lazy(() => import('./pages/PropezFluido'));
const VisualizarProposta = lazy(() => import('./pages/VisualizarProposta'));
const Servicos = lazy(() => import('./pages/Servicos'));
const Modelos = lazy(() => import('./pages/Modelos'));
const CriarModelo = lazy(() => import('./pages/CriarModelo'));
const Contratos = lazy(() => import('./pages/Contratos'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Planos = lazy(() => import('./pages/Planos'));
const Onboarding = lazy(() => import('./components/Onboarding'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminOrganizations = lazy(() => import('./pages/admin/AdminOrganizations'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptions'));
const AdminRetention = lazy(() => import('./pages/admin/AdminRetention'));
const AdminAcquisition = lazy(() => import('./pages/admin/AdminAcquisition'));
const AdminProduct = lazy(() => import('./pages/admin/AdminProduct'));
const AdminOperations = lazy(() => import('./pages/admin/AdminOperations'));
const AdminOrganizationDetail = lazy(() => import('./pages/admin/AdminOrganizationDetail'));
const AdminMarketplace = lazy(() => import('./pages/admin/AdminMarketplace'));
const AdminBlogList = lazy(() => import('./pages/admin/AdminBlogList'));
const AdminBlogEditor = lazy(() => import('./pages/admin/AdminBlogEditor'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));

const loadingFallback = (
  <div className="h-full min-h-screen w-full flex items-center justify-center text-zinc-500 bg-[#F5F5F7]">
    Carregando...
  </div>
);

export default function AuthenticatedApp() {
  const session = useSession();
  const initialLoaded = useInitialLoaded();
  const { route, routeParams, navigate } = useAppNavigation();
  const { unreadCount: notificationUnread } = useNotifications(Boolean(session));

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (session && !hydrated) {
      void hydrateStore().then(() => setHydrated(true));
    }
    if (!session && hydrated) {
      setHydrated(false);
    }
  }, [session, hydrated]);

  useEffect(() => {
    return subscribeToPlanosRequest((detail) => {
      navigate('planos', { targetPlan: detail.targetPlan });
    });
  }, [navigate]);

  if (!initialLoaded) {
    return loadingFallback;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const userConfig = store.getUserConfig();

  if (!userConfig.onboarded) {
    return (
      <Suspense fallback={loadingFallback}>
        <Onboarding onComplete={() => {}} />
      </Suspense>
    );
  }

  const renderContent = () => {
    switch (route) {
      case 'dashboard':
        return <Dashboard navigate={navigate} />;
      case 'clientes':
        return <Clientes navigate={navigate} />;
      case 'propostas':
        return <Propostas navigate={navigate} />;
      case 'pagamentos':
        return <Pagamentos navigate={navigate} />;
      case 'servicos':
        return <Servicos navigate={navigate} />;
      case 'modelos':
        return (
          <Modelos
            navigate={navigate}
            initialTab={(routeParams.tab as 'meus' | 'loja') ?? 'meus'}
          />
        );
      case 'loja-templates':
        return <Modelos navigate={navigate} initialTab="loja" />;
      case 'contratos':
        return <Contratos />;
      case 'criar-modelo':
        return <CriarModelo navigate={navigate} initialData={routeParams} />;
      case 'propez-fluido':
        return <PropezFluido navigate={navigate} initialData={routeParams} />;
      case 'visualizar-proposta':
        return <VisualizarProposta navigate={navigate} id={routeParams.id ?? ''} />;
      case 'configuracoes':
        return <Configuracoes navigate={navigate} />;
      case 'planos':
        return <Planos navigate={navigate} targetPlan={routeParams.targetPlan as 'free' | 'pro' | 'business' | undefined} />;
      case 'admin-dashboard':
        return session?.user.isPlatformAdmin ? <AdminDashboard navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-organizations':
        return session?.user.isPlatformAdmin ? <AdminOrganizations navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-users':
        return session?.user.isPlatformAdmin ? <AdminUsers navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-subscriptions':
        return session?.user.isPlatformAdmin ? <AdminSubscriptions navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-retention':
        return session?.user.isPlatformAdmin ? <AdminRetention navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-acquisition':
        return session?.user.isPlatformAdmin ? <AdminAcquisition navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-product':
        return session?.user.isPlatformAdmin ? <AdminProduct navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-operations':
        return session?.user.isPlatformAdmin ? <AdminOperations navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-organization-detail':
        return session?.user.isPlatformAdmin ? <AdminOrganizationDetail navigate={navigate} orgId={routeParams.id ?? ''} /> : <Dashboard navigate={navigate} />;
      case 'admin-marketplace':
        return session?.user.isPlatformAdmin ? <AdminMarketplace navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-blog':
        return session?.user.isPlatformAdmin ? <AdminBlogList navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-blog-editor':
        return session?.user.isPlatformAdmin ? (
          <AdminBlogEditor navigate={navigate} postId={routeParams.postId as string | undefined} />
        ) : (
          <Dashboard navigate={navigate} />
        );
      default:
        return <Dashboard navigate={navigate} />;
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
    exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  };

  if (route === 'propez-fluido' || route === 'visualizar-proposta' || route === 'criar-modelo') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          className="h-dvh min-h-0 w-full max-w-full overflow-hidden bg-[#F5F5F7]"
        >
          <Suspense fallback={loadingFallback}>{renderContent()}</Suspense>
        </motion.div>
      </AnimatePresence>
    );
  }

  const navItems: { id: AppRoute; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'clientes', label: 'Clientes', icon: <Users className="w-5 h-5" /> },
    { id: 'servicos', label: 'Serviços', icon: <Briefcase className="w-5 h-5" /> },
    { id: 'contratos', label: 'Contratos', icon: <FileText className="w-5 h-5" /> },
    { id: 'modelos', label: 'Modelos', icon: <Layers className="w-5 h-5" /> },
    { id: 'propostas', label: 'Propostas', icon: <FileText className="w-5 h-5" /> },
    { id: 'pagamentos', label: 'Pagamentos', icon: <DollarSign className="w-5 h-5" /> },
  ];

  const isPlatformAdmin = Boolean(session?.user.isPlatformAdmin);
  const isAdminRoute = route.startsWith('admin-');

  if (isAdminRoute && isPlatformAdmin) {
    return (
      <Suspense fallback={loadingFallback}>
        <AdminLayout navigate={navigate} current={route}>
          <Suspense fallback={loadingFallback}>{renderContent()}</Suspense>
        </AdminLayout>
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F5F7] font-sans overflow-hidden">
      <div className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-2xl border-r border-black/[0.05] z-40 relative">
        <div className="p-6">
          <PropezLogo height="md" />
        </div>
        <nav className="flex-1 px-4 mt-8 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = route === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id as AppRoute)}
                className={`w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-500 ${
                  isActive ? 'bg-zinc-900 text-white shadow-[0_10px_20px_-5px_rgba(0,0,0,0.15)]' : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'scale-100 opacity-50'}`}>
                  {item.icon}
                </div>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-black/[0.02]">
          <button
            type="button"
            onClick={() => navigate('configuracoes')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              route === 'configuracoes' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600'
            }`}
          >
            <Settings className="w-5 h-5" />
            Configurações
          </button>
          <button
            type="button"
            onClick={() => void authLogout().then(() => { window.location.href = '/'; })}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all mt-1"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </div>

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-2xl border-b border-black/[0.05] z-40 flex items-center justify-between px-5">
        <PropezLogo height="md" />
        <div className="flex items-center gap-2">
          <AppTopBarMobileButton navigate={navigate} showPlatformButton={isPlatformAdmin} />
          <button type="button" onClick={() => navigate('configuracoes')} className="w-10 h-10 flex items-center justify-center text-zinc-500 bg-zinc-100 rounded-full relative">
            <Bell className="w-5 h-5" />
            {notificationUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-[#ff5200] text-white rounded-full border-2 border-white">
                {notificationUnread > 9 ? '9+' : notificationUnread}
              </span>
            )}
          </button>
          <button type="button" onClick={() => navigate('configuracoes')} className="w-10 h-10 bg-gradient-to-tr from-zinc-200 to-zinc-300 rounded-full border-2 border-white shadow-sm overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              <User className="w-5 h-5" />
            </div>
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto w-full relative mobile-safe-top mobile-safe-bottom flex flex-col min-h-0">
        <AppTopBar navigate={navigate} showPlatformButton={isPlatformAdmin} />
        <div className="h-full w-full relative flex-1 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div key={route} initial="initial" animate="animate" exit="exit" variants={pageVariants} className="min-h-full">
              <Suspense fallback={loadingFallback}>{renderContent()}</Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <div className="md:hidden fixed bottom-6 left-6 right-6 h-20 bg-white/80 backdrop-blur-2xl border border-black/[0.05] rounded-[2rem] z-50 px-4 flex items-center justify-around shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)]">
        {navItems.map((item) => {
          const isActive = route === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 w-14 h-full transition-all active:scale-90 ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`}
            >
              <div className={`transition-all ${isActive ? 'scale-110 -translate-y-0.5' : 'scale-100'}`}>{item.icon}</div>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label.substring(0, 3)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

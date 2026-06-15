import { Suspense, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Settings, LogOut, Bell, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { getLastHydrateErrors, hydrateStore } from './lib/store';
import { subscribeToPlanosRequest } from './lib/navigationEvents';
import type { AppRoute } from './types/navigation';
import { useAppNavigation } from './hooks/useAppNavigation';
import {
  logout as authLogout,
  useInitialLoaded,
  useSession,
} from './lib/authSession';
import { BrandLogo } from './components/BrandLogo';
import { OrgBrandProvider } from './components/OrgBrandProvider';
import { resolveOrgBrand } from './lib/orgBrand';
import { AppTopBar, AppTopBarMobileButton } from './components/AppTopBar';
import { DESKTOP_NAV_ITEMS, MobileAppNav } from './components/MobileAppNav';
import { FeedbackProviders } from './components/FeedbackProviders';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { useNotifications } from './lib/useNotifications';
import { lazyWithRetry } from './lib/lazyWithRetry';

const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Clientes = lazyWithRetry(() => import('./pages/Clientes'));
const Propostas = lazyWithRetry(() => import('./pages/Propostas'));
const Pagamentos = lazyWithRetry(() => import('./pages/Pagamentos'));
const PropezFluido = lazyWithRetry(() => import('./pages/PropezFluido'));
const VisualizarProposta = lazyWithRetry(() => import('./pages/VisualizarProposta'));
const Servicos = lazyWithRetry(() => import('./pages/Servicos'));
const Modelos = lazyWithRetry(() => import('./pages/Modelos'));
const CriarModelo = lazyWithRetry(() => import('./pages/CriarModelo'));
const Contratos = lazyWithRetry(() => import('./pages/Contratos'));
const Agenda = lazyWithRetry(() => import('./pages/Agenda'));
const Configuracoes = lazyWithRetry(() => import('./pages/Configuracoes'));
const Planos = lazyWithRetry(() => import('./pages/Planos'));
const Onboarding = lazyWithRetry(() => import('./components/Onboarding'));
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard'));
const AdminOrganizations = lazyWithRetry(() => import('./pages/admin/AdminOrganizations'));
const AdminUsers = lazyWithRetry(() => import('./pages/admin/AdminUsers'));
const AdminSubscriptions = lazyWithRetry(() => import('./pages/admin/AdminSubscriptions'));
const AdminRetention = lazyWithRetry(() => import('./pages/admin/AdminRetention'));
const AdminAcquisition = lazyWithRetry(() => import('./pages/admin/AdminAcquisition'));
const AdminProduct = lazyWithRetry(() => import('./pages/admin/AdminProduct'));
const AdminOperations = lazyWithRetry(() => import('./pages/admin/AdminOperations'));
const AdminRequests = lazyWithRetry(() => import('./pages/admin/AdminRequests'));
const AdminOrganizationDetail = lazyWithRetry(() => import('./pages/admin/AdminOrganizationDetail'));
const AdminMarketplace = lazyWithRetry(() => import('./pages/admin/AdminMarketplace'));
const AdminAffiliates = lazyWithRetry(() => import('./pages/admin/AdminAffiliates'));
const AdminCoupons = lazyWithRetry(() => import('./pages/admin/AdminCoupons'));
const AdminBlogList = lazyWithRetry(() => import('./pages/admin/AdminBlogList'));
const AdminBlogEditor = lazyWithRetry(() => import('./pages/admin/AdminBlogEditor'));
const AdminLayout = lazyWithRetry(() => import('./pages/admin/AdminLayout'));

const loadingFallback = (
  <div className="h-full min-h-screen w-full flex flex-col items-center justify-center gap-3 bg-[#F5F5F7]">
    <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin" />
    <span className="text-sm font-medium text-zinc-400">Carregando…</span>
  </div>
);

export default function AuthenticatedApp() {
  const session = useSession();
  const initialLoaded = useInitialLoaded();
  const { route, routeParams, navigate } = useAppNavigation();
  const { unreadCount: notificationUnread } = useNotifications(Boolean(session));

  const [hydrated, setHydrated] = useState(false);
  const [hydrateErrors, setHydrateErrors] = useState<readonly { entity: string; message: string }[]>(
    [],
  );
  const isAdminRoute = route.startsWith('admin-');

  useEffect(() => {
    if (!initialLoaded || !session) return;
    if (isAdminRoute) {
      setHydrated(true);
      return;
    }
    if (!hydrated) {
      void hydrateStore().then(() => {
        setHydrateErrors(getLastHydrateErrors());
        setHydrated(true);
      });
    }
    if (!session && hydrated) {
      setHydrated(false);
      setHydrateErrors([]);
    }
  }, [session, hydrated, isAdminRoute, initialLoaded]);

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

  if (!session.organization.onboarded) {
    return (
      <Suspense fallback={loadingFallback}>
        <Onboarding onComplete={() => {}} />
      </Suspense>
    );
  }

  if (!isAdminRoute && !hydrated) {
    return loadingFallback;
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
      case 'agenda':
        return <Agenda navigate={navigate} />;
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
      case 'admin-affiliates':
        return session?.user.isPlatformAdmin ? <AdminAffiliates navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-coupons':
        return session?.user.isPlatformAdmin ? <AdminCoupons navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-retention':
        return session?.user.isPlatformAdmin ? <AdminRetention navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-acquisition':
        return session?.user.isPlatformAdmin ? <AdminAcquisition navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-product':
        return session?.user.isPlatformAdmin ? <AdminProduct navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-operations':
        return session?.user.isPlatformAdmin ? <AdminOperations navigate={navigate} /> : <Dashboard navigate={navigate} />;
      case 'admin-requests':
        return session?.user.isPlatformAdmin ? <AdminRequests navigate={navigate} /> : <Dashboard navigate={navigate} />;
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

  const pageResetKey = `${route}|${JSON.stringify(routeParams)}`;
  const pageContent = (
    <PageErrorBoundary resetKey={pageResetKey}>
      <Suspense fallback={loadingFallback}>{renderContent()}</Suspense>
    </PageErrorBoundary>
  );

  const pageVariants = {
    initial: { y: 8, scale: 0.99 },
    animate: { y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
    exit: { y: -8, scale: 0.99, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
  };

  const brand = resolveOrgBrand(session.organization);
  const navActiveClass =
    brand.isWhiteLabel && brand.primaryColor
      ? 'whitelabel-nav-active shadow-[0_10px_20px_-5px_rgba(0,0,0,0.15)]'
      : 'bg-zinc-900 text-white shadow-[0_10px_20px_-5px_rgba(0,0,0,0.15)]';
  const settingsActiveClass =
    brand.isWhiteLabel && brand.primaryColor
      ? 'whitelabel-nav-active shadow-sm'
      : 'bg-zinc-900 text-white shadow-sm';

  if (route === 'propez-fluido' || route === 'visualizar-proposta' || route === 'criar-modelo') {
    return (
      <OrgBrandProvider>
        <FeedbackProviders>
        <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          className="h-dvh min-h-0 w-full max-w-full overflow-hidden bg-[#F5F5F7]"
        >
          {pageContent}
        </motion.div>
      </AnimatePresence>
        </FeedbackProviders>
      </OrgBrandProvider>
    );
  }

  const isPlatformAdmin = Boolean(session?.user.isPlatformAdmin);

  if (isAdminRoute && isPlatformAdmin) {
    return (
      <Suspense fallback={loadingFallback}>
        <AdminLayout navigate={navigate} current={route}>
          {pageContent}
        </AdminLayout>
      </Suspense>
    );
  }

  return (
    <OrgBrandProvider>
    <FeedbackProviders>
    <div className="flex h-screen bg-[#F5F5F7] font-sans overflow-hidden">
      <div className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-2xl border-r border-black/[0.05] z-40 relative">
        <div className="p-6">
          <BrandLogo height="md" />
        </div>
        <nav className="flex-1 px-4 mt-8 space-y-1.5 overflow-y-auto custom-scrollbar">
          {DESKTOP_NAV_ITEMS.map((item) => {
            const isActive = route === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id as AppRoute)}
                className={`w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-500 ${
                  isActive ? navActiveClass : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900'
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
              route === 'configuracoes' ? settingsActiveClass : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600'
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

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-2xl border-b border-black/[0.05] z-40 flex items-center justify-between px-4 gap-2">
        <div className="min-w-0 shrink">
          <BrandLogo height="md" />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <AppTopBarMobileButton navigate={navigate} showPlatformButton={isPlatformAdmin} />
          <button type="button" onClick={() => navigate('configuracoes')} className="w-10 h-10 flex items-center justify-center text-zinc-500 bg-zinc-100 rounded-full relative">
            <Bell className="w-5 h-5" />
            {notificationUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold whitelabel-badge text-white rounded-full border-2 border-white">
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
        {hydrateErrors.length > 0 && (
          <div className="mx-4 mt-2 md:mx-6 md:mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex flex-wrap items-center justify-between gap-3">
            <span>
              Alguns dados não carregaram ({hydrateErrors.map((e) => e.entity).join(', ')}). Listas podem
              estar incompletas.
            </span>
            <button
              type="button"
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              onClick={() => {
                setHydrated(false);
                void hydrateStore(true).then(() => {
                  setHydrateErrors(getLastHydrateErrors());
                  setHydrated(true);
                });
              }}
            >
              Recarregar dados
            </button>
          </div>
        )}
        <div className="h-full w-full relative flex-1 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div key={route} initial="initial" animate="animate" exit="exit" variants={pageVariants} className="min-h-full">
              {pageContent}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <MobileAppNav
        route={route}
        navigate={navigate}
        navActiveClass={navActiveClass}
        onLogout={() => void authLogout().then(() => { window.location.href = '/'; })}
      />
    </div>
    </FeedbackProviders>
    </OrgBrandProvider>
  );
}

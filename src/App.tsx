import React, { Suspense, lazy, useEffect, useState } from 'react';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Layers, Briefcase, Bell, DollarSign, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { store } from './lib/store';
import { subscribeToPlanosRequest } from './lib/navigationEvents';
import type { AppRoute, NavigateFn, RouteParams } from './types/navigation';

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
const Login = lazy(() => import('./pages/Login'));

const loadingFallback = (
  <div className="h-full min-h-screen w-full flex items-center justify-center text-zinc-500 bg-[#F5F5F7]">
    Carregando...
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('propez_auth') === 'true';
  });
  const [route, setRoute] = useState<AppRoute>('dashboard');
  const [routeParams, setRouteParams] = useState<RouteParams>({});
  const [userConfig, setUserConfig] = useState(() => store.getUserConfig());

  const handleLogin = () => {
    localStorage.setItem('propez_auth', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('propez_auth');
    setIsAuthenticated(false);
  };

  const navigate: NavigateFn = (newRoute, params = {}) => {
    setRoute(newRoute);
    setRouteParams(params);
  };

  // Qualquer lugar do app pode pedir "leva o usuário para planos" via event bus.
  // Isso evita propagar `navigate` até componentes profundos (ex.: UpgradeGate).
  useEffect(() => {
    return subscribeToPlanosRequest((detail) => {
      navigate('planos', { targetPlan: detail.targetPlan });
    });
  }, []);

  // Suporte a URLs diretas: `?route=planos&success=true&session_id=...` cai aqui
  // quando o usuário retorna do Stripe Checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const directRoute = params.get('route') as AppRoute | null;
    if (directRoute && directRoute !== route) {
      navigate(directRoute);
    }
  }, []);

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
        return <Modelos navigate={navigate} />;
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
      default:
        return <Dashboard navigate={navigate} />;
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
  };

  if (!isAuthenticated) {
    return <Suspense fallback={loadingFallback}><Login onLogin={handleLogin} /></Suspense>;
  }

  if (!userConfig.onboarded) {
    return (
      <Suspense fallback={loadingFallback}>
        <Onboarding onComplete={() => setUserConfig(store.getUserConfig())} />
      </Suspense>
    );
  }

  if (route === 'propez-fluido' || route === 'visualizar-proposta' || route === 'criar-modelo') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          className="h-screen w-full overflow-hidden bg-[#F5F5F7]"
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

  return (
    <div className="flex h-screen bg-[#F5F5F7] font-sans overflow-hidden">
      
      {/* Desktop Sidebar - Apple Inspired */}
      <div className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-2xl border-r border-black/[0.05] z-40 relative">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">P</div>
          <span className="font-semibold text-zinc-900 tracking-tight text-lg">PropEZ</span>
        </div>
        
        <nav className="flex-1 px-4 mt-8 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = route === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id as AppRoute)}
                className={`w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-500 ${
                  isActive 
                    ? 'bg-zinc-900 text-white shadow-[0_10px_20px_-5px_rgba(0,0,0,0.15)]' 
                    : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900'
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
            onClick={() => navigate('configuracoes')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              route === 'configuracoes' 
                ? 'bg-zinc-900 text-white shadow-sm' 
                : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600'
            }`}
          >
            <Settings className="w-5 h-5" />
            Configurações
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all mt-1"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-2xl border-b border-black/[0.05] z-40 flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">P</div>
          <span className="font-semibold text-zinc-900 tracking-tight">PropEZ</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('configuracoes')}
            className="w-10 h-10 flex items-center justify-center text-zinc-500 bg-zinc-100 rounded-full active:scale-95 transition-all relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-amber-500 rounded-full border-2 border-white"></span>
          </button>
          <button 
            onClick={() => navigate('configuracoes')}
            className="w-10 h-10 bg-gradient-to-tr from-zinc-200 to-zinc-300 rounded-full border-2 border-white shadow-sm active:scale-90 transition-all overflow-hidden"
          >
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              <User className="w-5 h-5" />
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full relative mobile-safe-top mobile-safe-bottom">
        <div className="h-full w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={route}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              className="min-h-full"
            >
              <Suspense fallback={loadingFallback}>{renderContent()}</Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar - iOS Style */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 h-20 bg-white/80 backdrop-blur-2xl border border-black/[0.05] rounded-[2rem] z-50 px-4 pb-1 pt-1 flex items-center justify-around shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)]">
        {navItems.map((item) => {
          const isActive = route === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 w-14 h-full transition-all duration-300 active:scale-90 ${
                isActive ? 'text-zinc-900' : 'text-zinc-400'
              }`}
            >
              <div className={`transition-all duration-300 ${isActive ? 'scale-110 -translate-y-0.5' : 'scale-100'}`}>
                {item.icon}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-widest transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label.substring(0, 3)}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -bottom-1 w-1 h-1 bg-zinc-900 rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { LoggedInRedirect } from '../marketing/LoggedInRedirect';
import { LegacyRedirects } from './LegacyRedirects';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import HomeRoute from './HomeRoute';

const PublicProposta = lazy(() => import('../pages/PublicProposta'));
const AuthenticatedApp = lazy(() => import('../AuthenticatedApp'));
const SobreNosPage = lazy(() => import('../pages/marketing/SobreNosPage'));
const PublicPlanosPage = lazy(() => import('../pages/marketing/PublicPlanosPage'));
const BlogListPage = lazy(() => import('../pages/marketing/BlogListPage'));
const BlogPostPage = lazy(() => import('../pages/marketing/BlogPostPage'));
const LoginPage = lazy(() => import('../pages/marketing/LoginPage'));
const CadastroPage = lazy(() => import('../pages/marketing/CadastroPage'));
const NewsletterUnsubscribePage = lazy(() => import('../pages/marketing/NewsletterUnsubscribePage'));
const LegalPlaceholderPage = lazy(() => import('../pages/marketing/LegalPlaceholderPage'));
const SignContractPage = lazy(() => import('../pages/publicProposta/signing/SignContractPage'));
const ValidityPage = lazy(() => import('../pages/validity/ValidityPage'));

const loadingFallback = (
  <div className="min-h-screen flex items-center justify-center text-zinc-500 bg-white">
    Carregando...
  </div>
);

function MarketingWrap({ children }: { children: React.ReactNode }) {
  return <LoggedInRedirect>{children}</LoggedInRedirect>;
}

function PublicPropostaRoute() {
  const { token } = useParams<{ token: string }>();
  if (!token) return <Navigate to="/" replace />;
  return <PublicProposta token={token} />;
}

export default function AppRouter() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={loadingFallback}>
        <LegacyRedirects />
        <Routes>
          <Route path="/p/:publicToken/assinar/:signToken" element={<SignContractPage />} />
          <Route path="/validar/:documentId" element={<ValidityPage />} />
          <Route path="/p/:token" element={<PublicPropostaRoute />} />
          <Route path="/app/*" element={<AuthenticatedApp />} />
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<MarketingWrap><LoginPage /></MarketingWrap>} />
          <Route path="/cadastro" element={<MarketingWrap><CadastroPage /></MarketingWrap>} />
          <Route path="/sobre-nos" element={<MarketingWrap><SobreNosPage /></MarketingWrap>} />
          <Route path="/para-quem-serve" element={<Navigate to="/" replace />} />
          <Route path="/planos" element={<MarketingWrap><PublicPlanosPage /></MarketingWrap>} />
          <Route path="/blog" element={<MarketingWrap><BlogListPage /></MarketingWrap>} />
          <Route path="/blog/:slug" element={<MarketingWrap><BlogPostPage /></MarketingWrap>} />
          <Route path="/termos" element={<MarketingWrap><LegalPlaceholderPage title="Termos de uso" path="/termos" /></MarketingWrap>} />
          <Route path="/privacidade" element={<MarketingWrap><LegalPlaceholderPage title="Privacidade" path="/privacidade" /></MarketingWrap>} />
          <Route path="/newsletter/unsubscribe" element={<NewsletterUnsubscribePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}

import { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { LoggedInRedirect } from '../marketing/LoggedInRedirect';
import { LegacyRedirects } from './LegacyRedirects';
import { RouteErrorBoundaryOutlet } from './RouteErrorBoundary';
import { captureAffiliateFromUrl, trackAffiliatePageView } from '../lib/affiliateTracking';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import HomeRoute from './HomeRoute';
import NotFoundPage from './NotFoundPage';
const PublicProposta = lazyWithRetry(() => import('../pages/PublicProposta'));
const AuthenticatedApp = lazyWithRetry(() => import('../AuthenticatedApp'));
const SobreNosPage = lazyWithRetry(() => import('../pages/marketing/SobreNosPage'));
const PublicPlanosPage = lazyWithRetry(() => import('../pages/marketing/PublicPlanosPage'));
const BlogListPage = lazyWithRetry(() => import('../pages/marketing/BlogListPage'));
const BlogPostPage = lazyWithRetry(() => import('../pages/marketing/BlogPostPage'));
const LoginPage = lazyWithRetry(() => import('../pages/marketing/LoginPage'));
const CadastroPage = lazyWithRetry(() => import('../pages/marketing/CadastroPage'));
const NewsletterUnsubscribePage = lazyWithRetry(() => import('../pages/marketing/NewsletterUnsubscribePage'));
const LegalPlaceholderPage = lazyWithRetry(() => import('../pages/marketing/LegalPlaceholderPage'));
const SignContractPage = lazyWithRetry(() => import('../pages/publicProposta/signing/SignContractPage'));
const ValidityPage = lazyWithRetry(() => import('../pages/validity/ValidityPage'));

const loadingFallback = (
  <div className="min-h-screen flex items-center justify-center text-zinc-500 bg-white">
    Carregando...
  </div>
);

function MarketingWrap({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    captureAffiliateFromUrl();
    trackAffiliatePageView();
  }, []);
  return <LoggedInRedirect>{children}</LoggedInRedirect>;
}
function PublicPropostaRoute() {
  const { token } = useParams<{ token: string }>();
  if (!token) return <Navigate to="/" replace />;
  return <PublicProposta token={token} />;
}

export default function AppRouter() {
  return (
    <RouteErrorBoundaryOutlet>
      <Suspense fallback={loadingFallback}>
        <LegacyRedirects />
        <Routes>
          <Route path="/p/:publicToken/assinar/:signToken" element={<SignContractPage />} />
          <Route path="/assinar/:signToken" element={<SignContractPage />} />
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
    </RouteErrorBoundaryOutlet>
  );
}

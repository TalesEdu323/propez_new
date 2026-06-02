import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ShieldCheck, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/apiClient';
import { bootstrapSession } from '../../lib/authSession';
import { APP_BASE_PATH } from '../../lib/appPaths';
import { getAffiliateCode, getAffiliateSessionId, captureAffiliateFromUrl } from '../../lib/affiliateTracking';
import { PropezLogo } from '../PropezLogo';
import { GoogleAuthSection } from './GoogleAuthSection';

export type AuthMode =
  | 'login'
  | 'register'
  | 'verify'
  | 'forgot'
  | 'forgot-sent'
  | 'reset-password';

type AuthFormProps = {
  initialMode?: AuthMode;
  resetToken?: string | null;
  onSuccess?: () => void;
  showBrandingPanel?: boolean;
};

export function AuthForm({
  initialMode = 'login',
  resetToken = null,
  onSuccess,
  showBrandingPanel = true,
}: AuthFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(resetToken ? 'reset-password' : initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(false);

  useEffect(() => {
    void api.get<{ enabled: boolean }>('/api/auth/google/status')
      .then((data) => setGoogleLoginEnabled(Boolean(data.enabled)))
      .catch(() => setGoogleLoginEnabled(false));
  }, []);

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError === 'oauth_not_configured') {
      setErrorMsg('Login com Google não está configurado no servidor.');
    } else if (oauthError === 'oauth_failed') {
      setErrorMsg('Não foi possível entrar com Google. Tente novamente.');
    }
  }, [searchParams]);

  useEffect(() => {
    setErrorMsg(null);
    setInfo(null);
  }, [mode]);

  useEffect(() => {
    if (initialMode === 'register' && !resetToken) setMode('register');
  }, [initialMode, resetToken]);

  useEffect(() => {
    captureAffiliateFromUrl();
  }, []);

  async function finishAuth() {
    const session = await bootstrapSession();
    if (!session) {
      setErrorMsg(
        'Não foi possível validar sua sessão. Confirme que o servidor está ativo (npm run dev) e tente novamente.',
      );
      return;
    }
    if (onSuccess) onSuccess();
    else navigate(APP_BASE_PATH, { replace: true });
  }

  const goBack = (fallback: string) => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/api/auth/login', { email, password });
      await finishAuth();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403 && (err.body as { reason?: string })?.reason === 'email_not_verified') {
          setMode('verify');
          setInfo('Confirme seu email antes de entrar.');
          try {
            await api.post('/api/auth/resend-verification', { email });
          } catch { /* silencia */ }
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg('Falha ao entrar. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/api/auth/register', {
        name,
        company,
        email,
        password,
        affiliateCode: getAffiliateCode() ?? undefined,
        affiliateSessionId: getAffiliateSessionId(),
      });
      setMode('verify');
      setInfo('Enviamos um código de 6 dígitos para seu email.');
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Falha ao criar conta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/api/auth/verify-email', { email, code: code.join('') });
      await finishAuth();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Código inválido.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setMode('forgot-sent');
    } catch {
      setErrorMsg('Tente novamente em alguns instantes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) {
      setErrorMsg('Link inválido. Solicite um novo reset.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/api/auth/reset-password', { token: resetToken, password });
      setInfo('Senha atualizada. Entre com sua nova senha.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Não foi possível redefinir a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/api/auth/resend-verification', { email });
      setInfo('Código reenviado.');
    } catch {
      setErrorMsg('Não foi possível reenviar o código.');
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const formPanel = (
    <div className="w-full max-w-[360px]">
      <div className="mb-10">
        <PropezLogo height="xl" />
      </div>

      {(errorMsg || info) && (
        <div
          className={`mb-6 text-xs font-medium px-4 py-3 rounded-xl flex items-start gap-2 ${
            errorMsg
              ? 'bg-red-50 text-red-700 border border-red-100'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          }`}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMsg ?? info}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {mode === 'login' && (
          <motion.div key="login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">Bem-vindo</h2>
            <p className="text-zinc-400 text-sm mb-8">Acesse sua conta para gerenciar propostas.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between ml-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Senha</label>
                  <button type="button" onClick={() => setMode('forgot')} className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase">
                    Esqueceu?
                  </button>
                </div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="glass-input" />
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full mt-6">
                {isLoading ? 'Entrando...' : 'Entrar'}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
            {googleLoginEnabled && (
              <GoogleAuthSection label="Entrar com Google" redirect="/app" />
            )}
            <p className="mt-8 text-center text-xs text-zinc-400">
              Não tem conta?{' '}
              <button type="button" onClick={() => navigate('/cadastro')} className="font-bold text-zinc-900">
                Criar agora
              </button>
            </p>
          </motion.div>
        )}

        {mode === 'register' && (
          <motion.div key="register" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button type="button" onClick={() => goBack('/login')} className="flex items-center gap-2 text-zinc-400 mb-6 text-[10px] font-bold uppercase">
              <ChevronLeft className="w-3 h-3" /> Voltar
            </button>
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">Criar conta</h2>
            <p className="text-zinc-400 text-sm mb-8">Comece a criar propostas profissionais hoje.</p>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nome</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="glass-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Empresa</label>
                  <input type="text" required value={company} onChange={(e) => setCompany(e.target.value)} className="glass-input" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Senha</label>
                <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="glass-input" />
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full mt-6">
                {isLoading ? 'Enviando...' : 'Criar conta'}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
            {googleLoginEnabled && (
              <GoogleAuthSection label="Continuar com Google" redirect="/app" />
            )}
            <p className="mt-8 text-center text-xs text-zinc-400">
              Já tem conta?{' '}
              <button type="button" onClick={() => navigate('/login')} className="font-bold text-zinc-900">
                Entrar
              </button>
            </p>
          </motion.div>
        )}

        {mode === 'verify' && (
          <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Verificação</h2>
            <p className="text-sm text-zinc-400 mb-8">Código enviado para <strong>{email}</strong></p>
            <form onSubmit={handleVerify} className="space-y-8">
              <div className="flex justify-between gap-2">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    id={`code-${i}`}
                    type="text"
                    maxLength={1}
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    className="w-full h-14 bg-zinc-50 rounded-xl text-center text-xl font-bold focus:outline-none focus:ring-1 focus:ring-black/10"
                  />
                ))}
              </div>
              <button type="submit" disabled={isLoading || code.some((d) => !d)} className="btn-primary w-full">
                Validar código
              </button>
              <button type="button" onClick={handleResend} className="text-[10px] font-bold text-zinc-400 uppercase">
                Reenviar código
              </button>
            </form>
          </motion.div>
        )}

        {mode === 'forgot' && (
          <motion.div key="forgot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <button type="button" onClick={() => setMode('login')} className="flex items-center gap-2 text-zinc-400 mb-6 text-[10px] font-bold uppercase">
              <ChevronLeft className="w-3 h-3" /> Voltar
            </button>
            <h2 className="text-xl font-semibold mb-2">Recuperar acesso</h2>
            <form onSubmit={handleForgot} className="space-y-4 mt-6">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input" placeholder="seu@email.com" />
              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                Enviar link
              </button>
            </form>
          </motion.div>
        )}

        {mode === 'forgot-sent' && (
          <motion.div key="forgot-sent" className="text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
            <h2 className="text-xl font-semibold mb-2">Verifique seu email</h2>
            <button type="button" onClick={() => setMode('login')} className="btn-primary w-full mt-6">
              Voltar ao login
            </button>
          </motion.div>
        )}

        {mode === 'reset-password' && (
          <motion.div key="reset" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-xl font-semibold mb-2">Nova senha</h2>
            <form onSubmit={handleResetPassword} className="space-y-4 mt-6">
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="glass-input" placeholder="Nova senha" />
              <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="glass-input" placeholder="Confirmar senha" />
              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                Salvar senha
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const brandingPanel = showBrandingPanel ? (
    <div className="hidden lg:flex w-[55%] bg-[#F5F5F7] relative items-center justify-center overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-zinc-200/50 to-zinc-100/50 rounded-full blur-[120px]" />
      <div className="relative z-10 max-w-md text-center px-12">
        <h2 className="text-2xl lg:text-3xl font-semibold text-zinc-900 tracking-tight mb-6">
          A maneira mais elegante de fechar negócios.
        </h2>
        <p className="text-zinc-500 text-base leading-relaxed">
          Transforme suas propostas em experiências memoráveis. Simples, rápido e profissional.
        </p>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen w-full bg-white flex font-sans overflow-hidden">
      <div className={`w-full ${showBrandingPanel ? 'lg:w-[45%]' : ''} flex items-center justify-center p-8 md:p-12`}>
        {formPanel}
      </div>
      {brandingPanel}
    </div>
  );
}

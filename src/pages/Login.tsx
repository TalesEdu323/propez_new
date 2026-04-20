import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ShieldCheck, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { api, ApiError } from '../lib/apiClient';
import { bootstrapSession } from '../lib/authSession';

interface LoginProps {
  onLogin: () => void;
}

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'forgot-sent';

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setErrorMsg(null);
    setInfo(null);
  }, [mode]);

  async function onSuccessLogin() {
    await bootstrapSession();
    onLogin();
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/api/auth/login', { email, password });
      await onSuccessLogin();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403 && (err.body as { reason?: string })?.reason === 'email_not_verified') {
          setMode('verify');
          setInfo('Confirme seu email antes de entrar.');
          try {
            await api.post('/api/auth/resend-verification', { email });
          } catch {/* silencia */}
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
      await api.post('/api/auth/register', { name, company, email, password });
      setMode('verify');
      setInfo('Enviamos um código de 6 dígitos para seu email.');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Falha ao criar conta.');
      }
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
      await onSuccessLogin();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Código inválido.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg(null);
    setInfo(null);
    try {
      await api.post('/api/auth/resend-verification', { email });
      setInfo('Código reenviado. Verifique sua caixa de entrada.');
    } catch {
      setErrorMsg('Não foi possível reenviar o código.');
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

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex font-sans overflow-hidden">
      {/* Left Side: Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 md:p-12 relative z-10 bg-white">
        <div className="w-full max-w-[360px]">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 mb-16">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm"
            >
              P
            </motion.div>
            <h1 className="text-base font-semibold text-zinc-900 tracking-tight">Propez</h1>
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

          <div className="relative">
            <AnimatePresence mode="wait">
              {mode === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-10">
                    <h2 className="text-3xl font-semibold text-zinc-900 tracking-tightest mb-2">Bem-vindo</h2>
                    <p className="text-zinc-400 text-sm">Acesse sua conta para gerenciar propostas.</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail</label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="nome@empresa.com"
                        className="glass-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Senha</label>
                        <button
                          type="button"
                          onClick={() => setMode('forgot')}
                          className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-widest transition-colors"
                        >
                          Esqueceu?
                        </button>
                      </div>
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="glass-input"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full mt-6"
                    >
                      {isLoading ? 'Entrando...' : 'Entrar'}
                      {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </form>

                  <div className="mt-12 text-center">
                    <button 
                      onClick={() => setMode('register')}
                      className="text-zinc-400 text-xs font-medium hover:text-zinc-900 transition-colors"
                    >
                      Não tem uma conta? <span className="font-bold text-zinc-900">Criar agora</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {mode === 'register' && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-10">
                    <button 
                      onClick={() => setMode('login')}
                      className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-6 text-[10px] font-bold uppercase tracking-widest"
                    >
                      <ChevronLeft className="w-3 h-3" /> Voltar
                    </button>
                    <h2 className="text-3xl font-semibold text-zinc-900 tracking-tightest mb-2">Criar conta</h2>
                    <p className="text-zinc-400 text-sm">Comece a criar propostas profissionais hoje.</p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nome</label>
                        <input 
                          type="text" 
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="glass-input"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Empresa</label>
                        <input 
                          type="text" 
                          required
                          value={company}
                          onChange={e => setCompany(e.target.value)}
                          className="glass-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail</label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="glass-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Senha</label>
                      <input 
                        type="password" 
                        required
                        minLength={8}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="glass-input"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full mt-6"
                    >
                      {isLoading ? 'Enviando...' : 'Criar Conta'}
                      {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </form>
                </motion.div>
              )}

              {mode === 'verify' && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-zinc-50 text-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-black/[0.02]">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-semibold text-zinc-900 tracking-tightest mb-2">Verificação</h2>
                    <p className="text-zinc-400 text-sm">Enviamos um código para <span className="text-zinc-900 font-medium">{email}</span></p>
                  </div>

                  <form onSubmit={handleVerify} className="space-y-10">
                    <div className="flex justify-between gap-2">
                      {code.map((digit, i) => (
                        <input
                          key={i}
                          id={`code-${i}`}
                          type="text"
                          maxLength={1}
                          inputMode="numeric"
                          value={digit}
                          onChange={e => handleCodeChange(i, e.target.value)}
                          className="w-full h-14 bg-zinc-50 border border-transparent rounded-xl text-center text-xl font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-black/5 transition-all"
                        />
                      ))}
                    </div>

                    <button 
                      type="submit"
                      disabled={isLoading || code.some(d => !d)}
                      className="btn-primary w-full"
                    >
                      {isLoading ? 'Verificando...' : 'Validar Código'}
                      {!isLoading && <CheckCircle2 className="w-4 h-4" />}
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleResend}
                        className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors"
                      >
                        Reenviar código
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {mode === 'forgot' && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-10">
                    <button
                      onClick={() => setMode('login')}
                      className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-6 text-[10px] font-bold uppercase tracking-widest"
                    >
                      <ChevronLeft className="w-3 h-3" /> Voltar
                    </button>
                    <h2 className="text-3xl font-semibold text-zinc-900 tracking-tightest mb-2">Recuperar acesso</h2>
                    <p className="text-zinc-400 text-sm">Informe seu email para receber o link de redefinição.</p>
                  </div>
                  <form onSubmit={handleForgot} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="glass-input"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full mt-6"
                    >
                      {isLoading ? 'Enviando...' : 'Enviar link'}
                      {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </form>
                </motion.div>
              )}

              {mode === 'forgot-sent' && (
                <motion.div
                  key="forgot-sent"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-zinc-50 text-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-black/[0.02]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-semibold text-zinc-900 tracking-tightest mb-2">Verifique seu email</h2>
                  <p className="text-zinc-400 text-sm mb-8">Se o email existir, você receberá um link em poucos segundos.</p>
                  <button
                    onClick={() => setMode('login')}
                    className="btn-primary w-full"
                  >
                    Voltar ao login
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Links */}
          <div className="mt-24 flex justify-start gap-8">
            <button className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest hover:text-zinc-900 transition-colors">Suporte</button>
            <button className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest hover:text-zinc-900 transition-colors">Privacidade</button>
          </div>
        </div>
      </div>

      {/* Right Side: Visual/Branding */}
      <div className="hidden lg:flex w-[55%] bg-[#F5F5F7] relative items-center justify-center overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-zinc-200/50 to-zinc-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-tr from-zinc-100/50 to-zinc-200/50 rounded-full blur-[120px]" />
        
        <div className="relative z-10 max-w-md text-center px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/60 backdrop-blur-md border border-white/40 rounded-full shadow-sm mb-10">
              <span className="flex h-1.5 w-1.5 rounded-full bg-zinc-900" />
              <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Propostas Fluídas</span>
            </div>
            <h2 className="text-5xl font-semibold text-zinc-900 tracking-tightest leading-[1.05] mb-8 text-balance">
              A maneira mais elegante de fechar negócios.
            </h2>
            <p className="text-zinc-500 text-base leading-relaxed mb-16 text-balance">
              Transforme suas propostas em experiências memoráveis. Simples, rápido e profissional.
            </p>

            <div className="relative mx-auto w-full max-w-[320px]">
              <div className="aspect-[4/3] bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-black/[0.01] overflow-hidden p-8 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-2 w-1/3 bg-zinc-100 rounded-full" />
                  <div className="h-6 w-full bg-zinc-50 rounded-lg" />
                  <div className="h-6 w-2/3 bg-zinc-50 rounded-lg" />
                </div>
                <div className="flex justify-end">
                  <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl -rotate-6" />
              <div className="absolute -bottom-4 -left-8 w-20 h-20 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl rotate-12" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/apiClient';
import { fetchSession, useSession } from '../../lib/authSession';

interface SecuritySettingsPanelProps {
  onClose: () => void;
}

export default function SecuritySettingsPanel({ onClose }: SecuritySettingsPanelProps) {
  const session = useSession();
  const hasPassword = session?.user.hasPassword !== false;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStep, setEmailStep] = useState<'request' | 'confirm'>('request');
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage('As senhas não coincidem.');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordMessage('Senha alterada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendResetLink = async () => {
    setPasswordMessage(null);
    setChangingPassword(true);
    try {
      await api.post('/api/auth/send-password-reset-self', {});
      setPasswordMessage('Link de redefinição enviado para o seu e-mail.');
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : 'Erro ao enviar e-mail');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage(null);
    setEmailLoading(true);
    try {
      await api.post('/api/auth/request-email-change', {
        newEmail: newEmail.trim().toLowerCase(),
        password: emailPassword,
      });
      setEmailStep('confirm');
      setEmailMessage('Código enviado para o novo e-mail. Verifique a caixa de entrada.');
      setEmailPassword('');
    } catch (err) {
      setEmailMessage(err instanceof Error ? err.message : 'Erro ao solicitar alteração');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConfirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage(null);
    setEmailLoading(true);
    try {
      const res = await api.post<{ ok: boolean; email: string }>(
        '/api/auth/confirm-email-change',
        { code: emailCode.trim() },
      );
      await fetchSession();
      setEmailMessage(`E-mail atualizado para ${res.email}.`);
      setEmailStep('request');
      setNewEmail('');
      setEmailCode('');
    } catch (err) {
      setEmailMessage(err instanceof Error ? err.message : 'Código inválido ou expirado');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setVerifyMessage(null);
    setVerifyLoading(true);
    try {
      const res = await api.post<{ sent?: boolean; alreadyVerified?: boolean }>(
        '/api/auth/resend-verification-self',
        {},
      );
      if (res.alreadyVerified) {
        setVerifyMessage('Seu e-mail já está verificado.');
      } else {
        setVerifyMessage('Código de verificação enviado para o seu e-mail.');
      }
    } catch (err) {
      setVerifyMessage(err instanceof Error ? err.message : 'Erro ao reenviar código');
    } finally {
      setVerifyLoading(false);
    }
  };

  const emailUnverified = !session?.user.emailVerifiedAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="apple-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-black/5 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Segurança</h2>
            <p className="text-xs text-zinc-500">Senha, e-mail e verificação</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Senha */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-bold text-zinc-900">Alterar senha</h3>
            </div>
            {hasPassword ? (
              <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-3">
                <input
                  type="password"
                  placeholder="Senha atual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-black/5 rounded-xl text-sm bg-zinc-50"
                  required
                />
                <input
                  type="password"
                  placeholder="Nova senha (mín. 8 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  className="w-full px-3 py-2.5 border border-black/5 rounded-xl text-sm bg-zinc-50"
                  required
                />
                <input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-black/5 rounded-xl text-sm bg-zinc-50"
                  required
                />
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {changingPassword ? 'Salvando…' : 'Alterar senha'}
                </button>
              </form>
            ) : (
              <p className="text-sm text-zinc-600 mb-3">
                Sua conta usa login com Google. Use o link abaixo para definir uma senha por e-mail.
              </p>
            )}
            <button
              type="button"
              disabled={changingPassword}
              onClick={() => void handleSendResetLink()}
              className="mt-3 text-sm font-semibold text-violet-600 hover:text-violet-800 disabled:opacity-50"
            >
              Enviar link de redefinição por e-mail
            </button>
            {passwordMessage && (
              <p
                className={`mt-2 text-sm ${
                  passwordMessage.includes('sucesso') || passwordMessage.includes('enviado')
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {passwordMessage}
              </p>
            )}
          </section>

          {/* E-mail */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-bold text-zinc-900">Alterar e-mail</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              E-mail atual: <strong>{session?.user.email}</strong>
            </p>
            {emailStep === 'request' ? (
              <form onSubmit={(e) => void handleRequestEmailChange(e)} className="space-y-3">
                <input
                  type="email"
                  placeholder="Novo e-mail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-black/5 rounded-xl text-sm bg-zinc-50"
                  required
                />
                {hasPassword && (
                  <input
                    type="password"
                    placeholder="Senha atual (confirmação)"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-black/5 rounded-xl text-sm bg-zinc-50"
                    required
                  />
                )}
                <button
                  type="submit"
                  disabled={emailLoading || !hasPassword}
                  className="w-full py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {emailLoading ? 'Enviando…' : 'Enviar código para novo e-mail'}
                </button>
                {!hasPassword && (
                  <p className="text-xs text-amber-600">
                    Contas Google-only precisam contactar o suporte para alterar o e-mail.
                  </p>
                )}
              </form>
            ) : (
              <form onSubmit={(e) => void handleConfirmEmailChange(e)} className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Código de 6 dígitos"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="w-full px-3 py-2.5 border border-black/5 rounded-xl text-sm bg-zinc-50 tracking-widest text-center"
                  required
                />
                <button
                  type="submit"
                  disabled={emailLoading || emailCode.length !== 6}
                  className="w-full py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {emailLoading ? 'Confirmando…' : 'Confirmar novo e-mail'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailStep('request');
                    setEmailCode('');
                    setEmailMessage(null);
                  }}
                  className="text-sm text-zinc-500 hover:text-zinc-800"
                >
                  Voltar
                </button>
              </form>
            )}
            {emailMessage && (
              <p
                className={`mt-2 text-sm ${
                  emailMessage.includes('atualizado') || emailMessage.includes('enviado')
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {emailMessage}
              </p>
            )}
          </section>

          {/* Verificação */}
          {emailUnverified && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-zinc-900">Verificar e-mail</h3>
              </div>
              <p className="text-sm text-zinc-600 mb-3">
                Seu e-mail ainda não foi verificado. Reenvie o código de confirmação.
              </p>
              <button
                type="button"
                disabled={verifyLoading}
                onClick={() => void handleResendVerification()}
                className="w-full py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {verifyLoading ? 'Enviando…' : 'Reenviar código de verificação'}
              </button>
              {verifyMessage && (
                <p className="mt-2 text-sm text-green-600">{verifyMessage}</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

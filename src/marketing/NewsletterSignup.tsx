import { useState } from 'react';
import { api } from '../lib/apiClient';

export function NewsletterSignup({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMsg('');
    try {
      await api.post('/api/newsletter/subscribe', { email, name: name || undefined, source: 'blog' });
      setStatus('ok');
      setMsg('Inscrição confirmada! Obrigado.');
      setEmail('');
      setName('');
    } catch {
      setStatus('err');
      setMsg('Não foi possível inscrever. Tente novamente.');
    }
  };

  return (
    <form onSubmit={submit} className={compact ? 'flex flex-col sm:flex-row gap-2' : 'space-y-3 max-w-md'}>
      {!compact && (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome (opcional)"
          className="glass-input"
        />
      )}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="seu@email.com"
        className="glass-input flex-1"
      />
      <button type="submit" disabled={status === 'loading'} className="btn-primary shrink-0">
        {status === 'loading' ? 'Enviando...' : 'Assinar newsletter'}
      </button>
      {msg && (
        <p className={`text-sm ${status === 'ok' ? 'text-emerald-600' : 'text-red-600'} ${compact ? 'sm:w-full' : ''}`}>
          {msg}
        </p>
      )}
    </form>
  );
}

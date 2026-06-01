import { useState } from 'react';
import { api, ApiError } from '../../lib/apiClient';

interface EnterpriseRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function EnterpriseRequestForm({ onSuccess, onCancel }: EnterpriseRequestFormProps) {
  const [teamSize, setTeamSize] = useState('');
  const [proposalVolume, setProposalVolume] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/requests', {
        type: 'enterprise',
        payload: {
          teamSize: teamSize.trim() || null,
          proposalVolume: proposalVolume.trim() || null,
          contactEmail: contactEmail.trim() || null,
          message: message.trim() || null,
        },
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao enviar solicitação.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <p className="text-sm text-zinc-500">
        Conte sobre seu time e volume de propostas. Entraremos em contato para montar o plano Business ideal.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Tamanho do time
          </label>
          <input
            type="text"
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            className="glass-input w-full px-4 py-3 text-sm"
            placeholder="Ex.: 5 pessoas"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Propostas / mês
          </label>
          <input
            type="text"
            value={proposalVolume}
            onChange={(e) => setProposalVolume(e.target.value)}
            className="glass-input w-full px-4 py-3 text-sm"
            placeholder="Ex.: 50+"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          E-mail de contato
        </label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="glass-input w-full px-4 py-3 text-sm"
          placeholder="seu@email.com"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Mensagem
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="glass-input w-full px-4 py-3 text-sm"
          placeholder="Conte mais sobre sua operação..."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Enviando…' : 'Enviar solicitação'}
        </button>
      </div>
    </form>
  );
}

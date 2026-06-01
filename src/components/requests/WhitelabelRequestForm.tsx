import { useState } from 'react';
import { api, ApiError } from '../../lib/apiClient';
import { ColorPickerRow } from '../builder/properties/ColorPickerRow';

interface WhitelabelRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function WhitelabelRequestForm({ onSuccess, onCancel }: WhitelabelRequestFormProps) {
  const [primaryColor, setPrimaryColor] = useState('#18181b');
  const [message, setMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/requests', {
        type: 'whitelabel',
        payload: { primaryColor, logoUrl: logoUrl ?? null, message: message.trim() || null },
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
        Descreva a identidade visual desejada. Nossa equipe revisará e aplicará no app e nas propostas públicas.
      </p>

      <ColorPickerRow
        label="Cor primária desejada"
        value={primaryColor}
        onChange={setPrimaryColor}
      />

      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Logo (opcional)
        </label>
        <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Observações
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="glass-input w-full px-4 py-3 text-sm"
          placeholder="Ex.: usar tons de azul marinho, logo horizontal..."
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

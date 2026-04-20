import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, User, Building2, Mail, Phone } from 'lucide-react';
import { fetchClientsFromCRM, type ExternalClient } from '../../services/crmApi';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (lead: ExternalClient) => void;
}

export function ProSyncLeadPickerModal({ open, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<ExternalClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchClientsFromCRM({ limit: 50 })
      .then(res => {
        if (cancelled) return;
        setLeads(res);
        if (res.length === 0) {
          setError('Nenhum lead retornado pelo ProSync. Verifique a configuração de integração.');
        }
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erro ao consultar ProSync.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(l =>
      [l.name, l.email, l.company, l.phone].some(v => (v || '').toLowerCase().includes(q)),
    );
  }, [leads, search]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-black/[0.05]">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                  Importar lead do ProSync
                </h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Selecione um lead para preencher a proposta automaticamente.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 border-b border-black/[0.05]">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome, email, empresa..."
                  className="w-full bg-zinc-50 border border-transparent rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 focus:bg-white focus:border-black/[0.05]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading && (
                <div className="text-center py-12 text-sm text-zinc-400">Carregando leads...</div>
              )}
              {!loading && error && (
                <div className="text-center py-12 text-sm text-red-500">{error}</div>
              )}
              {!loading && !error && filtered.length === 0 && (
                <div className="text-center py-12 text-sm text-zinc-400">
                  Nenhum lead corresponde à busca.
                </div>
              )}
              <div className="space-y-2">
                {filtered.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => onSelect(lead)}
                    className="w-full flex items-start gap-4 p-4 rounded-2xl border border-black/[0.05] bg-white hover:bg-zinc-50 transition-all text-left shadow-sm hover:shadow-md"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-zinc-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-900 truncate">
                          {lead.name}
                        </span>
                        {lead.status && (
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em] bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                            {lead.status}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500 flex flex-wrap gap-x-4 gap-y-1">
                        {lead.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {lead.phone}
                          </span>
                        )}
                        {lead.company && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {lead.company}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

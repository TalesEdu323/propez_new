import { useMemo, useState } from 'react';
import { DollarSign, CheckCircle2, Clock, Search, ArrowUpRight, Check, X } from 'lucide-react';
import { store, updateProposta } from '../lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { formatBRL } from '../lib/format';
import { usePropostas } from '../hooks/useStoreEntity';
import type { NavigateFn } from '../types/navigation';
import { ListingViewToggle } from '../components/listing/ListingViewToggle';
import { useListingViewPref } from '../hooks/useListingViewPref';
import { LISTING_GRID_CLASS, LISTING_LIST_CLASS } from '../components/listing/listingLayout';

const PAGAMENTOS_VIEW_KEY = 'listing_view:pagamentos';

export default function Pagamentos({ navigate }: { navigate: NavigateFn }) {
  const allPropostas = usePropostas();
  const propostas = useMemo(() => allPropostas.filter(p => p.status === 'aprovada'), [allPropostas]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'todos' | 'pagos' | 'pendentes'>('todos');
  const [listView, setListView] = useListingViewPref(PAGAMENTOS_VIEW_KEY, 'list');

  const toggleStatus = (id: string) => {
    const proposta = allPropostas.find(p => p.id === id);
    if (!proposta) return;
    const isPago = !proposta.pago;
    const patch = {
      pago: isPago,
      data_pagamento: isPago ? new Date().toISOString() : undefined,
    };
    store.savePropostas(allPropostas.map(p => (p.id === id ? { ...p, ...patch } : p)));
    void updateProposta(id, patch).catch(() => {
      store.savePropostas(allPropostas);
    });
  };

  const filteredPropostas = propostas.filter(p => {
    const matchesSearch = p.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'todos' ? true :
      filter === 'pagos' ? p.pago : !p.pago;
    return matchesSearch && matchesFilter;
  });

  const totalRecebido = propostas.filter(p => p.pago).reduce((acc, p) => acc + p.valor, 0);
  const totalPendente = propostas.filter(p => !p.pago).reduce((acc, p) => acc + p.valor, 0);

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 px-1 md:px-0">
        <div>
          <h1 className="page-title">Financeiro.</h1>
          <p className="text-zinc-400 mt-4 font-medium tracking-tight">Controle o fluxo de caixa das propostas aprovadas.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
          <div className="apple-card !p-6 flex flex-col gap-2 shadow-[0_20px_40px_-12px_rgba(16,185,129,0.1)]">
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.25em]">Recebido</span>
            <span className="text-2xl font-bold text-zinc-900 tracking-tightest">
              {formatBRL(totalRecebido, { fractionDigits: 0 })}
            </span>
          </div>
          <div className="apple-card !p-6 flex flex-col gap-2 shadow-[0_20px_40px_-12px_rgba(245,158,11,0.1)]">
            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-[0.25em]">Pendente</span>
            <span className="text-2xl font-bold text-zinc-900 tracking-tightest">
              {formatBRL(totalPendente, { fractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
          <input 
            type="text" 
            placeholder="Buscar por cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input pl-14 py-4"
          />
        </div>
        <ListingViewToggle view={listView} onChange={setListView} />
        <div className="flex bg-white/50 backdrop-blur-3xl p-1.5 rounded-2xl border border-black/[0.05] shadow-sm">
          {(['todos', 'pagos', 'pendentes'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
                filter === f 
                  ? 'bg-zinc-900 text-white shadow-lg shadow-black/10' 
                  : 'text-zinc-400 hover:text-zinc-600 hover:bg-black/[0.02]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className={listView === 'grid' ? LISTING_GRID_CLASS : LISTING_LIST_CLASS}>
        <AnimatePresence mode="popLayout">
          {filteredPropostas.map((p) => (
            <motion.div
              layout
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="apple-card apple-card-hover group shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)]"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-700 ${
                    p.pago ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-300 border border-black/[0.02]'
                  }`}>
                    {p.pago ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 text-xl tracking-tight leading-tight">{p.cliente_nome}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-base font-bold text-zinc-900 tracking-tightest">
                        {formatBRL(p.valor)}
                      </span>
                      <span className="text-zinc-200">•</span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Aprovada em {new Date(p.data_criacao).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {p.pago ? (
                    <div className="text-right mr-4 hidden md:block">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] block">Pago em</span>
                      <span className="text-sm font-bold text-zinc-900">{new Date(p.data_pagamento!).toLocaleDateString('pt-BR')}</span>
                    </div>
                  ) : (
                    <div className="flex gap-2 mr-4">
                      {p.chavePix && (
                        <div className="px-3 py-1 bg-zinc-50 rounded-lg border border-black/[0.03] text-[10px] font-bold text-zinc-400 uppercase tracking-widest">PIX</div>
                      )}
                      {p.linkPagamento && (
                        <div className="px-3 py-1 bg-zinc-50 rounded-lg border border-black/[0.03] text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Link</div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStatus(p.id)}
                      className={`h-11 px-6 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all flex items-center gap-2 ${
                        p.pago 
                          ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200' 
                          : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-black/10'
                      }`}
                    >
                      {p.pago ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      {p.pago ? 'Estornar' : 'Marcar Pago'}
                    </button>

                    <button 
                      onClick={() => navigate('visualizar-proposta', { id: p.id })}
                      className="w-11 h-11 flex items-center justify-center bg-zinc-50 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"
                      title="Visualizar Proposta"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredPropostas.length === 0 && (
          <div className="text-center py-24 apple-card">
            <div className="w-20 h-20 bg-zinc-50 rounded-3xl border border-black/[0.03] flex items-center justify-center mx-auto mb-6">
              <DollarSign className="w-10 h-10 text-zinc-300" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Nenhum pagamento encontrado</h3>
            <p className="text-zinc-500 mt-2 font-medium text-sm">Apenas propostas aprovadas aparecem nesta lista.</p>
          </div>
        )}
      </div>
    </div>
  );
}

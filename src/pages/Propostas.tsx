import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { store } from '../lib/store';
import { duplicateProposta } from '../lib/duplicateEntity';
import { motion, type Variants } from 'motion/react';
import { usePropostas, useServicos } from '../hooks/useStoreEntity';
import type { NavigateFn } from '../types/navigation';
import { ListingShell } from '../components/listing/ListingShell';
import { ListingViewToggle } from '../components/listing/ListingViewToggle';
import { useListingViewPref } from '../hooks/useListingViewPref';
import { LISTING_GRID_CLASS, LISTING_LIST_CLASS, LISTING_EMPTY_STATE_CLASS } from '../components/listing/listingLayout';
import { ProposalListingCard } from '../components/listing/proposals/ProposalListingCard';
import { ProposalListingRow } from '../components/listing/proposals/ProposalListingRow';
import { ProposalWaitingPanel } from '../components/listing/proposals/ProposalWaitingPanel';
import { AnimatePresence } from 'motion/react';
import { confirmDelete, confirmDuplicate } from '../lib/feedback';

const VIEW_PREF_KEY = 'listing_view:propostas';

export default function Propostas({ navigate }: { navigate: NavigateFn }) {
  const propostas = usePropostas();
  const servicos = useServicos();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todas' | 'pendente' | 'aprovada' | 'recusada'>('todas');
  const [view, setView] = useListingViewPref(VIEW_PREF_KEY, 'grid');
  const [activeId, setActiveId] = useState<string | null>(null);

  const getServicosNomes = (ids: string[]) => {
    if (!ids || ids.length === 0) return 'Nenhum serviço';
    const nomes = ids.map((id) => servicos.find((s) => s.id === id)?.nome).filter(Boolean);
    return nomes.length > 0 ? nomes.join(', ') : 'Serviços não encontrados';
  };

  const filteredPropostas = propostas.filter((p) => {
    const matchesSearch =
      p.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getServicosNomes(p.servicos).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'todas' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    const proposta = propostas.find((p) => p.id === id);
    if (!(await confirmDelete('propez_propostas', proposta?.cliente_nome))) return;
    store.savePropostas(propostas.filter((p) => p.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const handleDuplicate = async (id: string) => {
    if (!(await confirmDuplicate('propez_propostas'))) return;
    const source = propostas.find((p) => p.id === id);
    if (!source) return;
    store.savePropostas([duplicateProposta(source), ...propostas]);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  if (activeId) {
    return (
      <ProposalWaitingPanel
        proposalId={activeId}
        onBack={() => setActiveId(null)}
        navigate={navigate}
      />
    );
  }

  return (
    <div className="min-h-full bg-[#F5F5F7] font-sans selection:bg-zinc-200">
      <div className="page-container">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-semibold uppercase tracking-[0.15em]">
              <FileText className="w-3.5 h-3.5" />
              Gestão de Negócios
            </div>
            <motion.h1 variants={itemVariants} className="page-title font-bold">
              Propostas.
            </motion.h1>
            <motion.p variants={itemVariants} className="text-zinc-500 font-medium tracking-tight">
              Acompanhe o status e gerencie suas propostas enviadas.
            </motion.p>
          </div>

          <motion.button
            variants={itemVariants}
            onClick={() => navigate('propez-fluido')}
            className="group relative flex items-center justify-center gap-2 bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all hover:bg-zinc-800 hover:shadow-2xl hover:shadow-zinc-900/20 active:scale-[0.98] overflow-hidden shadow-xl shadow-zinc-900/10"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            <span>Nova Proposta</span>
          </motion.button>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="show">
          <ListingShell
            searchPlaceholder="Buscar por cliente ou serviço..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            viewToggle={
              <ListingViewToggle view={view} onChange={setView} />
            }
            filters={
              <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                {(['todas', 'pendente', 'aprovada', 'recusada'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all whitespace-nowrap ${
                      filterStatus === status
                        ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20'
                        : 'bg-white text-zinc-400 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-600'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            }
          >
            {filteredPropostas.length === 0 ? (
              <div className={LISTING_EMPTY_STATE_CLASS}>
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-center mx-auto mb-8">
                  <FileText className="w-8 h-8 text-zinc-200" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 tracking-tight mb-2">Nenhuma proposta encontrada</h3>
                <p className="text-zinc-400 text-sm font-medium mb-10 max-w-xs mx-auto">
                  Crie sua primeira proposta para começar a fechar negócios.
                </p>
                <button type="button" onClick={() => navigate('propez-fluido')} className="btn-primary inline-flex">
                  Criar Proposta
                </button>
              </div>
            ) : (
              <div className={view === 'grid' ? `${LISTING_GRID_CLASS} p-6 sm:p-10` : `${LISTING_LIST_CLASS} p-4 sm:p-6`}>
                <AnimatePresence mode="popLayout">
                  {filteredPropostas.map((proposta, index) =>
                    view === 'grid' ? (
                      <ProposalListingCard
                        key={proposta.id}
                        proposta={proposta}
                        servicosLabel={getServicosNomes(proposta.servicos)}
                        index={index}
                        onOpen={setActiveId}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
                      />
                    ) : (
                      <ProposalListingRow
                        key={proposta.id}
                        proposta={proposta}
                        servicosLabel={getServicosNomes(proposta.servicos)}
                        onOpen={setActiveId}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
                      />
                    ),
                  )}
                </AnimatePresence>
              </div>
            )}
          </ListingShell>
        </motion.div>
      </div>
    </div>
  );
}

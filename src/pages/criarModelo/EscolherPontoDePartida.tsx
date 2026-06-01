import { useState } from 'react';
import { motion } from 'motion/react';
import { LayoutTemplate, Plus, Sparkles, Eye } from 'lucide-react';
import { STARTER_TEMPLATES, applyStarterTemplate } from '../../data/starterTemplates';
import type { BuilderElement, BuilderPageLayout } from '../../types/builder';
import type { OfferType } from '../../lib/layoutContext';
import { AiBriefPromptModal } from '../../components/ia/AiBriefPromptModal';
import { AiLayoutPreviewModal } from '../../components/ia/AiLayoutPreviewModal';
import { useUserConfig } from '../../hooks/useStoreEntity';
import { canUse } from '../../lib/featureFlags';

export interface EscolherPontoDePartidaProps {
  onBlank: () => void;
  onStarter: (starterId: string) => void;
  onAiGenerated: (
    elementos: BuilderElement[],
    pageLayout?: BuilderPageLayout,
    offerType?: OfferType,
    brief?: string,
  ) => void;
}

export function EscolherPontoDePartida({ onBlank, onStarter, onAiGenerated }: EscolherPontoDePartidaProps) {
  const userConfig = useUserConfig();
  const iaGate = canUse('ia.generate', userConfig);

  const [aiOpen, setAiOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewElements, setPreviewElements] = useState<BuilderElement[]>([]);
  const [previewPageLayout, setPreviewPageLayout] = useState<BuilderPageLayout | undefined>();
  const [previewTitle, setPreviewTitle] = useState('');
  const [pendingStarterId, setPendingStarterId] = useState<string | null>(null);

  const [previewOfferType, setPreviewOfferType] = useState<OfferType | undefined>();
  const [previewBrief, setPreviewBrief] = useState('');

  const handleLayoutGenerated = (
    elementos: BuilderElement[],
    pageLayout?: BuilderPageLayout,
    offerType?: OfferType,
    brief?: string,
  ) => {
    setPreviewElements(elementos);
    setPreviewPageLayout(pageLayout);
    setPreviewOfferType(offerType);
    setPreviewBrief(brief ?? '');
    setPreviewTitle('Layout gerado por IA');
    setPendingStarterId(null);
    setPreviewOpen(true);
  };

  const handleStarterClick = (starterId: string) => {
    const applied = applyStarterTemplate(starterId);
    if (!applied) return;
    setPendingStarterId(starterId);
    setPreviewElements(applied.elementos);
    setPreviewPageLayout(applied.pageLayout);
    setPreviewTitle(applied.nome);
    setPreviewOpen(true);
  };

  const handleAcceptPreview = () => {
    if (pendingStarterId) {
      onStarter(pendingStarterId);
      setPendingStarterId(null);
    } else {
      onAiGenerated(previewElements, previewPageLayout, previewOfferType, previewBrief);
    }
    setPreviewOpen(false);
    setPreviewElements([]);
    setPreviewPageLayout(undefined);
  };

  const handleRegenerate = () => {
    setPreviewOpen(false);
    if (pendingStarterId) {
      handleStarterClick(pendingStarterId);
      return;
    }
    setAiOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPendingStarterId(null);
    setPreviewElements([]);
  };

  return (
    <>
      <div className="min-h-screen bg-[#f5f5f4] flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl w-full">
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2 text-center">Novo modelo de proposta</h1>
          <p className="text-zinc-500 text-center mb-12">
            Escolha um template (com preview), gere com IA ou comece em branco.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <motion.button
              type="button"
              onClick={() => setAiOpen(true)}
              whileHover={{ y: -4 }}
              className="p-6 rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-white text-left min-h-[200px] shadow-sm hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">IA generativa</span>
              <h3 className="text-lg font-bold text-zinc-900 mt-1">Gerar com IA</h3>
              <p className="text-sm text-zinc-500 mt-2 line-clamp-3">
                Descreva a proposta e receba um layout pronto com textos e blocos.
              </p>
              {!iaGate.allowed ? (
                <span className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                  Pro
                </span>
              ) : null}
            </motion.button>

            <motion.button
              type="button"
              onClick={onBlank}
              whileHover={{ y: -4 }}
              className="p-8 rounded-[2rem] border-2 border-dashed border-zinc-200 bg-white flex flex-col items-center justify-center text-center min-h-[200px] hover:border-zinc-400 transition-colors"
            >
              <Plus className="w-10 h-10 text-zinc-400 mb-4" />
              <span className="font-semibold text-zinc-900">Em branco</span>
              <span className="text-sm text-zinc-500 mt-2">Começar do zero</span>
            </motion.button>

            {STARTER_TEMPLATES.map((t) => (
              <motion.button
                key={t.id}
                type="button"
                onClick={() => handleStarterClick(t.id)}
                whileHover={{ y: -4 }}
                className="p-6 rounded-[2rem] border border-black/5 bg-white text-left min-h-[200px] shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-4">
                  <LayoutTemplate className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t.categoria}</span>
                <h3 className="text-lg font-bold text-zinc-900 mt-1">{t.nome}</h3>
                <p className="text-sm text-zinc-500 mt-2 line-clamp-3">{t.descricao}</p>
                <p className="text-xs text-zinc-400 mt-3 inline-flex items-center gap-1 font-medium">
                  <Eye className="w-3.5 h-3.5" />
                  Ver preview
                </p>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      <AiBriefPromptModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        mode="layout"
        onLayoutGenerated={handleLayoutGenerated}
      />

      <AiLayoutPreviewModal
        open={previewOpen}
        elementos={previewElements}
        pageLayout={previewPageLayout}
        title={previewTitle ? `Preview — ${previewTitle}` : 'Preview do layout'}
        description="Revise os blocos antes de continuar. Você poderá editar tudo no editor visual."
        acceptLabel={pendingStarterId ? 'Usar este template' : 'Usar este layout'}
        onClose={handleClosePreview}
        onAccept={handleAcceptPreview}
        onRegenerate={pendingStarterId ? undefined : handleRegenerate}
      />
    </>
  );
}

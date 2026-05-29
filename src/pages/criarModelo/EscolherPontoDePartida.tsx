import { useState } from 'react';
import { motion } from 'motion/react';
import { LayoutTemplate, Plus, Sparkles } from 'lucide-react';
import { STARTER_TEMPLATES } from '../../data/starterTemplates';
import type { BuilderElement } from '../../types/builder';
import { AiBriefPromptModal } from '../../components/ia/AiBriefPromptModal';
import { AiLayoutPreviewModal } from '../../components/ia/AiLayoutPreviewModal';
import { useUserConfig } from '../../hooks/useStoreEntity';
import { canUse } from '../../lib/featureFlags';

export interface EscolherPontoDePartidaProps {
  onBlank: () => void;
  onStarter: (starterId: string) => void;
  onAiGenerated: (elementos: BuilderElement[]) => void;
}

export function EscolherPontoDePartida({ onBlank, onStarter, onAiGenerated }: EscolherPontoDePartidaProps) {
  const userConfig = useUserConfig();
  const iaGate = canUse('ia.generate', userConfig);

  const [aiOpen, setAiOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewElements, setPreviewElements] = useState<BuilderElement[]>([]);

  const handleLayoutGenerated = (elementos: BuilderElement[]) => {
    setPreviewElements(elementos);
    setPreviewOpen(true);
  };

  const handleAcceptLayout = () => {
    onAiGenerated(previewElements);
    setPreviewOpen(false);
    setPreviewElements([]);
  };

  const handleRegenerate = () => {
    setPreviewOpen(false);
    setAiOpen(true);
  };

  return (
    <>
      <div className="min-h-screen bg-[#f5f5f4] flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl w-full">
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2 text-center">Novo modelo de proposta</h1>
          <p className="text-zinc-500 text-center mb-12">Escolha um template, gere com IA ou comece em branco.</p>

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
                onClick={() => onStarter(t.id)}
                whileHover={{ y: -4 }}
                className="p-6 rounded-[2rem] border border-black/5 bg-white text-left min-h-[200px] shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-4">
                  <LayoutTemplate className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t.categoria}</span>
                <h3 className="text-lg font-bold text-zinc-900 mt-1">{t.nome}</h3>
                <p className="text-sm text-zinc-500 mt-2 line-clamp-3">{t.descricao}</p>
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
        onClose={() => setPreviewOpen(false)}
        onAccept={handleAcceptLayout}
        onRegenerate={handleRegenerate}
      />
    </>
  );
}

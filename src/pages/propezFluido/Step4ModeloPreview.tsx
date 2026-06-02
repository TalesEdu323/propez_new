import { motion } from 'motion/react';
import { Pencil } from 'lucide-react';
import { LayoutPreviewPanel } from '../../components/builder/LayoutPreviewPanel';
import { normalizePageLayout } from '../../lib/pageLayout';
import type { BuilderElement, BuilderPageLayout } from '../../types/builder';

export interface Step4ModeloPreviewProps {
  previewElementos: BuilderElement[];
  pageLayout?: BuilderPageLayout;
  modeloId?: string;
  onEditModelo: () => void;
}

export function Step4ModeloPreview({
  previewElementos,
  pageLayout,
  modeloId,
  onEditModelo,
}: Step4ModeloPreviewProps) {
  const normalizedLayout = normalizePageLayout(pageLayout);

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex-1 min-h-0 flex flex-col bg-[#fafafa]"
    >
      {modeloId && (
        <div className="shrink-0 flex justify-end px-4 py-2 md:px-6 md:py-3 bg-white/80 backdrop-blur-sm border-b border-black/5 z-10">
          <button
            type="button"
            onClick={onEditModelo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar modelo
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {previewElementos.length > 0 ? (
          <LayoutPreviewPanel
            elementos={previewElementos}
            pageLayout={normalizedLayout}
            className="h-full min-h-0 rounded-none border-0 bg-transparent"
            maxHeight="none"
          />
        ) : (
          <div className="flex-1 h-full flex items-center justify-center p-12 text-center text-zinc-500 text-sm">
            Nenhum layout disponível. Volte ao passo 1 e selecione um modelo.
          </div>
        )}
      </div>
    </motion.div>
  );
}

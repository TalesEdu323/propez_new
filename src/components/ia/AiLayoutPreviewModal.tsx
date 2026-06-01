import type { BuilderElement, BuilderPageLayout } from '../../types/builder';
import { DEFAULT_PAGE_LAYOUT } from '../../lib/pageLayout';
import { PageShell } from '../builder/PageShell';
import { RenderElement } from '../builder/RenderElement';
import { Modal } from '../ui/Modal';

export interface AiLayoutPreviewModalProps {
  open: boolean;
  elementos: BuilderElement[];
  pageLayout?: BuilderPageLayout;
  title?: string;
  description?: string;
  acceptLabel?: string;
  onClose: () => void;
  onAccept: () => void;
  /** Omitir ou undefined para esconder o botão de regerar */
  onRegenerate?: () => void;
}

export function AiLayoutPreviewModal({
  open,
  elementos,
  pageLayout = DEFAULT_PAGE_LAYOUT,
  title = 'Preview do layout gerado',
  description = 'Revise os blocos antes de continuar. Você poderá editar tudo no editor visual.',
  acceptLabel = 'Usar este layout',
  onClose,
  onAccept,
  onRegenerate,
}: AiLayoutPreviewModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={title}
      description={description}
      footer={
        <>
          {onRegenerate ? (
            <button
              type="button"
              onClick={onRegenerate}
              className="px-5 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 rounded-xl transition-colors"
            >
              Gerar de novo
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 rounded-xl transition-colors"
            >
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={onAccept}
            className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-all"
          >
            {acceptLabel}
          </button>
        </>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-black/5 bg-[#fafafa]">
        <PageShell layout={pageLayout} className="py-8">
          <div className="space-y-2 pointer-events-none">
            {elementos.map((el) => (
              <RenderElement key={el.id} element={el} previewMode />
            ))}
          </div>
        </PageShell>
      </div>
    </Modal>
  );
}

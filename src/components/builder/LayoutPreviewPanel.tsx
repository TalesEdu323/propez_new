import type { BuilderElement, BuilderPageLayout } from '../../types/builder';
import { DEFAULT_PAGE_LAYOUT } from '../../lib/pageLayout';
import { PageShell } from './PageShell';
import { RenderElement } from './RenderElement';

export interface LayoutPreviewPanelProps {
  elementos: BuilderElement[];
  pageLayout?: BuilderPageLayout;
  className?: string;
  maxHeight?: string;
}

export function LayoutPreviewPanel({
  elementos,
  pageLayout = DEFAULT_PAGE_LAYOUT,
  className = '',
  maxHeight = '60vh',
}: LayoutPreviewPanelProps) {
  const isFullHeight = maxHeight === 'none';

  return (
    <div
      className={`overflow-y-auto rounded-xl border border-black/5 bg-[#fafafa] ${isFullHeight ? 'h-full min-h-0' : ''} ${className}`}
      style={isFullHeight ? undefined : { maxHeight }}
    >
      <PageShell layout={pageLayout} className="py-8">
        <div className="space-y-2 pointer-events-none">
          {elementos.map((el) => (
            <RenderElement key={el.id} element={el} previewMode pageLayout={pageLayout} />
          ))}
        </div>
      </PageShell>
    </div>
  );
}

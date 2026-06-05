import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { BuilderElement, BuilderElementType, BuilderPageLayout, BuilderViewport } from '../types/builder';
import { createId } from '../lib/ids';
import { normalizePageLayout } from '../lib/pageLayout';
import { DEFAULT_PROPS } from './builder/defaultProps';
import { RenderElement } from './builder/RenderElement';
import { BuilderCanvas } from './builder/BuilderCanvas';
import { BuilderWidgetPalette } from './builder/BuilderWidgetPalette';
import { BuilderToolbar } from './builder/BuilderToolbar';
import { PropertiesPanel, type BuilderTab } from './builder/PropertiesPanel';
import { useBuilderPersistence } from './builder/useBuilderPersistence';
import { useUserConfig } from '../hooks/useStoreEntity';
import { resolvePlan } from '../lib/store';
import {
  canUsePdfExport,
  getAllowedWidgets,
  getWidgetRequiredPlan,
  isWidgetAllowed,
  PLAN_META,
  type PlanTier,
} from '../lib/featureFlags';
import { UpgradeGate } from './UpgradeGate';
import { loadUiPreference, saveUiPreference } from '../lib/uiPreferences';
import {
  addElementToParent as addElementToParentTree,
  updateElementRecursive as updateElementRecursiveTree,
  deleteElementRecursive as deleteElementRecursiveTree,
  moveElementRecursive as moveElementRecursiveTree,
  findElementRecursive as findElementRecursiveTree,
} from './builder/tree';

export { RenderElement };

export type ElementType = BuilderElementType;
export type ElementData = BuilderElement;

export type BuilderSaveHandler = (
  elements: ElementData[],
  pageLayout: BuilderPageLayout,
) => void | Promise<void>;

const PREF_VIEWPORT_TOOLTIP = 'builder:viewport_tooltip_dismissed';
const PREF_MOBILE_REVIEWED = 'builder:mobile_layout_reviewed';

export default function Builder({
  initialElements,
  initialPageLayout,
  onSave,
  onBack,
  onChange,
  onPageLayoutChange,
  saveLabel = 'Salvar',
  saveLoading = false,
  saveError = null,
  previewMode: initialPreviewMode = false,
  embedded = false,
  widgetWhitelist,
  hideImportExport = false,
  showPageLayoutPanel = true,
}: {
  initialElements?: ElementData[];
  initialPageLayout?: BuilderPageLayout;
  onSave?: BuilderSaveHandler | ((elements: ElementData[]) => void);
  onBack?: () => void;
  onChange?: (elements: ElementData[]) => void;
  onPageLayoutChange?: (layout: BuilderPageLayout) => void;
  saveLabel?: string;
  saveLoading?: boolean;
  saveError?: string | null;
  previewMode?: boolean;
  embedded?: boolean;
  widgetWhitelist?: ReadonlySet<BuilderElementType>;
  hideImportExport?: boolean;
  /** Mini-builder de serviço: sem painel de layout da página */
  showPageLayoutPanel?: boolean;
}) {
  const [elements, setElements] = useBuilderPersistence({ initialElements, onChange });
  const [pageLayout, setPageLayout] = useState<BuilderPageLayout>(
    () => normalizePageLayout(initialPageLayout),
  );
  const historyRef = useRef<{ elements: BuilderElement[]; pageLayout: BuilderPageLayout }[]>([]);
  const historyIndexRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  const [historyVersion, setHistoryVersion] = useState(0);

  const pushHistory = useCallback((nextElements: BuilderElement[], nextLayout: BuilderPageLayout) => {
    if (skipHistoryRef.current) return;
    const snapshot = { elements: nextElements, pageLayout: nextLayout };
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmed.push(snapshot);
    if (trimmed.length > 50) trimmed.shift();
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    setHistoryVersion((v) => v + 1);
  }, []);

  const setElementsWithHistory = useCallback((updater: BuilderElement[] | ((prev: BuilderElement[]) => BuilderElement[])) => {
    setElements((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pushHistory(next, pageLayout);
      return next;
    });
  }, [setElements, pushHistory, pageLayout]);

  const updatePageLayout = useCallback((layout: BuilderPageLayout) => {
    setPageLayout(layout);
    onPageLayoutChange?.(layout);
    pushHistory(elements, layout);
  }, [onPageLayoutChange, pushHistory, elements]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snap = historyRef.current[historyIndexRef.current];
    skipHistoryRef.current = true;
    setElements(snap.elements);
    setPageLayout(snap.pageLayout);
    onPageLayoutChange?.(snap.pageLayout);
    onChange?.(snap.elements);
    skipHistoryRef.current = false;
    setHistoryVersion((v) => v + 1);
  }, [setElements, onPageLayoutChange, onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snap = historyRef.current[historyIndexRef.current];
    skipHistoryRef.current = true;
    setElements(snap.elements);
    setPageLayout(snap.pageLayout);
    onPageLayoutChange?.(snap.pageLayout);
    onChange?.(snap.elements);
    skipHistoryRef.current = false;
    setHistoryVersion((v) => v + 1);
  }, [setElements, onPageLayoutChange, onChange]);

  useEffect(() => {
    if (historyIndexRef.current === -1) {
      pushHistory(elements, pageLayout);
    }
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(initialPreviewMode);
  const [viewport, setViewport] = useState<BuilderViewport>(embedded ? 'mobile' : 'desktop');
  const [activeTab, setActiveTab] = useState<BuilderTab>('properties');
  const [mobileReviewed, setMobileReviewed] = useState(false);
  const [showViewportTooltip, setShowViewportTooltip] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [tooltipDismissed, mobileDone] = await Promise.all([
        loadUiPreference<boolean>(PREF_VIEWPORT_TOOLTIP),
        loadUiPreference<boolean>(PREF_MOBILE_REVIEWED),
      ]);
      if (cancelled) return;
      setShowViewportTooltip(!tooltipDismissed);
      setMobileReviewed(!!mobileDone);
      setPrefsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialPageLayout) setPageLayout(normalizePageLayout(initialPageLayout));
  }, [initialPageLayout]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;
  void historyVersion;

  const userConfig = useUserConfig();
  const plan = resolvePlan(userConfig);
  const allowedWidgets = widgetWhitelist ?? getAllowedWidgets(plan);
  const usePlanGate = !widgetWhitelist;
  const pdfGate = canUsePdfExport(userConfig);
  const [upgradeGate, setUpgradeGate] = useState<{
    open: boolean;
    feature: string;
    reason?: string;
    requiredPlan: PlanTier;
  }>({ open: false, feature: '', requiredPlan: 'pro' });

  const openUpgradeForWidget = (type: BuilderElementType) => {
    const required = getWidgetRequiredPlan(type);
    setUpgradeGate({
      open: true,
      feature: 'Este widget',
      reason: `O widget "${type}" está disponível a partir do plano ${PLAN_META[required].name}.`,
      requiredPlan: required,
    });
  };

  const handleViewportChange = (v: BuilderViewport) => {
    setViewport(v);
    if (v === 'mobile') {
      setMobileReviewed(true);
      void saveUiPreference(PREF_MOBILE_REVIEWED, true);
    }
  };

  const handleExport = () => {
    if (!pdfGate.allowed) {
      setUpgradeGate({
        open: true,
        feature: 'Exportar proposta',
        reason: pdfGate.reason,
        requiredPlan: pdfGate.requiredPlan ?? 'pro',
      });
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify({ elements, pageLayout }),
    );
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'taggo_landing_page.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setElementsWithHistory(json);
        } else {
          if (Array.isArray(json.elements)) setElementsWithHistory(json.elements);
          if (json.pageLayout) updatePageLayout(normalizePageLayout(json.pageLayout));
        }
      } catch {
        alert('Arquivo inválido!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDragStart = (e: React.DragEvent, type: ElementType) => {
    e.dataTransfer.setData('elementType', type);
  };

  const handleDrop = (e: React.DragEvent, parentId: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('elementType') as ElementType;
    if (!type) return;

    if (usePlanGate && !isWidgetAllowed(plan, type)) {
      openUpgradeForWidget(type);
      return;
    }
    if (widgetWhitelist && !widgetWhitelist.has(type)) {
      return;
    }

    const newElement = {
      id: createId(),
      type,
      props: { ...DEFAULT_PROPS[type] },
      ...(type === 'grid' || type === 'container' || type === 'column' ? { children: [] } : {}),
    } as ElementData;

    if (type === 'grid') {
      const colsCount = parseInt(DEFAULT_PROPS.grid.columns || '2');
      newElement.children = Array.from({ length: colsCount }).map(() => ({
        id: createId(),
        type: 'column' as ElementType,
        props: { ...DEFAULT_PROPS.column },
        children: [],
      })) as ElementData[];
    }

    if (parentId) {
      setElementsWithHistory(addElementToParentTree(elements, parentId, newElement));
    } else {
      setElementsWithHistory([...elements, newElement]);
    }
    setSelectedId(newElement.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const updateElement = (id: string, newProps: Record<string, any>) => {
    setElementsWithHistory(
      updateElementRecursiveTree(elements, id, newProps, (merged, original, props) => {
        if (original.type === 'grid' && props.columns) {
          const newColCount = parseInt(props.columns as string);
          const currentCols = original.children || [];
          if (newColCount > currentCols.length) {
            const colsToAdd = newColCount - currentCols.length;
            const newCols = Array.from({ length: colsToAdd }).map(() => ({
              id: createId(),
              type: 'column' as ElementType,
              props: { ...DEFAULT_PROPS.column },
              children: [],
            })) as ElementData[];
            return { ...merged, children: [...currentCols, ...newCols] } as ElementData;
          } else if (newColCount < currentCols.length) {
            return { ...merged, children: currentCols.slice(0, newColCount) } as ElementData;
          }
        }
        return merged;
      }),
    );
  };

  const deleteElement = (id: string) => {
    setElementsWithHistory(deleteElementRecursiveTree(elements, id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveElement = (id: string, direction: 'up' | 'down') => {
    setElementsWithHistory(moveElementRecursiveTree(elements, id, direction));
  };

  const handleSaveClick = async () => {
    if (!onSave || saveLoading) return;
    if (!mobileReviewed && !embedded) {
      const goMobile = window.confirm(
        'Recomendamos revisar a proposta no celular antes de salvar. Abrir visualização mobile agora?',
      );
      if (goMobile) {
        handleViewportChange('mobile');
        return;
      }
    }
    await (onSave as BuilderSaveHandler)(elements, pageLayout);
  };

  const selectedElement = selectedId ? findElementRecursiveTree(elements, selectedId) : undefined;
  const rootHeight = embedded ? 'h-full min-h-0 flex-1' : 'h-screen';

  return (
    <div className={`${rootHeight} w-full min-w-0 flex bg-transparent font-sans overflow-hidden text-zinc-900`}>
      {!previewMode && (
        <BuilderWidgetPalette
          embedded={embedded}
          onDragStart={handleDragStart}
          allowedWidgets={allowedWidgets}
          onLockedWidgetClick={openUpgradeForWidget}
        />
      )}

      <BuilderCanvas
        embedded={embedded}
        elements={elements}
        pageLayout={pageLayout}
        viewport={viewport}
        selectedId={selectedId}
        previewMode={previewMode}
        onSelectElement={setSelectedId}
        onGoToLayers={(id) => { setActiveTab('layers'); setSelectedId(id); }}
        onMoveElement={moveElement}
        onDeleteElement={deleteElement}
        onDropRoot={(e) => handleDrop(e)}
        onDropChild={(e, parentId) => handleDrop(e, parentId)}
        onDragOver={handleDragOver}
        toolbar={
          <BuilderToolbar
            embedded={embedded}
            previewMode={previewMode}
            viewport={viewport}
            onViewportChange={handleViewportChange}
            showViewportTooltip={prefsLoaded && showViewportTooltip}
            onDismissViewportTooltip={() => {
              setShowViewportTooltip(false);
              void saveUiPreference(PREF_VIEWPORT_TOOLTIP, true);
            }}
            saveLabel={saveLabel}
            saveLoading={saveLoading}
            saveError={saveError}
            onBack={onBack}
            onTogglePreview={() => { setPreviewMode(!previewMode); setSelectedId(null); }}
            onImport={hideImportExport ? undefined : handleImport}
            onExport={hideImportExport ? undefined : handleExport}
            exportLocked={hideImportExport || !pdfGate.allowed}
            onClear={() => { if (confirm('Tem certeza que deseja limpar tudo?')) setElementsWithHistory([]); }}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onSave={onSave ? handleSaveClick : undefined}
          />
        }
      />

      {!previewMode && (
        <PropertiesPanel
          embedded={embedded}
          elements={elements}
          selectedId={selectedId}
          selectedElement={selectedElement}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setSelectedId={setSelectedId}
          updateElement={updateElement}
          pageLayout={pageLayout}
          onPageLayoutChange={updatePageLayout}
          showPageLayoutPanel={showPageLayoutPanel}
        />
      )}

      <UpgradeGate
        open={upgradeGate.open}
        onClose={() => setUpgradeGate(prev => ({ ...prev, open: false }))}
        feature={upgradeGate.feature}
        reason={upgradeGate.reason}
        requiredPlan={upgradeGate.requiredPlan}
      />
    </div>
  );
}

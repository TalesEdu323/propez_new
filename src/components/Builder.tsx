import React, { useState } from 'react';

import type { BuilderElement, BuilderElementType } from '../types/builder';
import { createId } from '../lib/ids';
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
import {
  addElementToParent as addElementToParentTree,
  updateElementRecursive as updateElementRecursiveTree,
  deleteElementRecursive as deleteElementRecursiveTree,
  moveElementRecursive as moveElementRecursiveTree,
  findElementRecursive as findElementRecursiveTree,
} from './builder/tree';

export { RenderElement };

// --- Types ---
export type ElementType = BuilderElementType;
export type ElementData = BuilderElement;

export default function Builder({
  initialElements,
  onSave,
  onBack,
  onChange,
  saveLabel = 'Salvar',
  previewMode: initialPreviewMode = false,
}: {
  initialElements?: ElementData[];
  onSave?: (elements: ElementData[]) => void;
  onBack?: () => void;
  onChange?: (elements: ElementData[]) => void;
  saveLabel?: string;
  previewMode?: boolean;
}) {
  const [elements, setElements] = useBuilderPersistence({ initialElements, onChange });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(initialPreviewMode);
  const [activeTab, setActiveTab] = useState<BuilderTab>('properties');

  const userConfig = useUserConfig();
  const plan = resolvePlan(userConfig);
  const allowedWidgets = getAllowedWidgets(plan);
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

  // --- Export / Import ---
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
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(elements));
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
        setElements(json);
      } catch {
        alert('Arquivo inválido!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, type: ElementType) => {
    e.dataTransfer.setData('elementType', type);
  };

  const handleDrop = (e: React.DragEvent, parentId: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('elementType') as ElementType;
    if (!type) return;

    // Segunda barreira: mesmo que alguém consiga iniciar o drag de um widget
    // bloqueado (ex.: DOM customizado), impedimos a inserção aqui.
    if (!isWidgetAllowed(plan, type)) {
      openUpgradeForWidget(type);
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
      setElements(addElementToParentTree(elements, parentId, newElement));
    } else {
      setElements([...elements, newElement]);
    }
    setSelectedId(newElement.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // --- Element Actions ---
  const updateElement = (id: string, newProps: Record<string, any>) => {
    setElements(
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
      })
    );
  };

  const deleteElement = (id: string) => {
    setElements(deleteElementRecursiveTree(elements, id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveElement = (id: string, direction: 'up' | 'down') => {
    setElements(moveElementRecursiveTree(elements, id, direction));
  };

  const selectedElement = selectedId ? findElementRecursiveTree(elements, selectedId) : undefined;

  return (
    <div className="h-screen w-full flex bg-transparent font-sans overflow-hidden text-zinc-900">

      {/* LEFT SIDEBAR: WIDGETS */}
      {!previewMode && (
        <BuilderWidgetPalette
          onDragStart={handleDragStart}
          allowedWidgets={allowedWidgets}
          onLockedWidgetClick={openUpgradeForWidget}
        />
      )}

      {/* CENTER: CANVAS (DROP ZONE) */}
      <BuilderCanvas
        elements={elements}
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
            previewMode={previewMode}
            saveLabel={saveLabel}
            onBack={onBack}
            onTogglePreview={() => { setPreviewMode(!previewMode); setSelectedId(null); }}
            onImport={handleImport}
            onExport={handleExport}
            exportLocked={!pdfGate.allowed}
            onClear={() => { if (confirm('Tem certeza que deseja limpar tudo?')) setElements([]); }}
            onSave={onSave ? () => onSave(elements) : undefined}
          />
        }
      />

      {/* RIGHT SIDEBAR: PROPERTIES PANEL */}
      {!previewMode && (
        <PropertiesPanel
          elements={elements}
          selectedId={selectedId}
          selectedElement={selectedElement}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setSelectedId={setSelectedId}
          updateElement={updateElement}
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

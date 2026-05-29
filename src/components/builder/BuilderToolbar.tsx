import React from 'react';
import {
  ChevronLeft, Eye, EyeOff, Upload, Download, Trash, Save, Lock,
  Monitor, Tablet, Smartphone, Undo2, Redo2,
} from 'lucide-react';
import type { BuilderViewport } from '../../types/builder';
import { VIEWPORT_LABELS } from './constants';

export interface BuilderToolbarProps {
  previewMode: boolean;
  viewport: BuilderViewport;
  onViewportChange: (v: BuilderViewport) => void;
  showViewportTooltip?: boolean;
  onDismissViewportTooltip?: () => void;
  saveLabel?: string;
  onBack?: () => void;
  onTogglePreview: () => void;
  onImport?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport?: () => void;
  exportLocked?: boolean;
  onClear: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSave?: () => void;
  embedded?: boolean;
}

export function BuilderToolbar({
  previewMode,
  viewport,
  onViewportChange,
  showViewportTooltip,
  onDismissViewportTooltip,
  saveLabel = 'Salvar',
  onBack,
  onTogglePreview,
  onImport,
  onExport,
  exportLocked = false,
  onClear,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onSave,
  embedded = false,
}: BuilderToolbarProps) {
  const viewportButtons: { v: BuilderViewport; icon: React.ReactNode }[] = [
    { v: 'desktop', icon: <Monitor className="w-4 h-4" /> },
    { v: 'tablet', icon: <Tablet className="w-4 h-4" /> },
    { v: 'mobile', icon: <Smartphone className="w-4 h-4" /> },
  ];

  return (
    <div className="h-16 glass-panel border-b border-black/5 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 shadow-sm shrink-0 bg-white/80">
      <div className="flex items-center gap-2 flex-wrap">
        {onBack && (
          <button type="button" onClick={onBack} className="btn-secondary mr-2">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
        )}
        <button
          type="button"
          onClick={onTogglePreview}
          className={`btn-secondary ${previewMode ? 'bg-zinc-100 text-zinc-900 border-black/10 shadow-inner' : ''}`}
        >
          {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {previewMode ? 'Sair do Preview' : 'Preview'}
        </button>

        <div className="relative flex items-center bg-zinc-100 rounded-xl p-1 border border-black/5 ml-1">
          {viewportButtons.map(({ v, icon }) => (
            <button
              key={v}
              type="button"
              title={VIEWPORT_LABELS[v]}
              onClick={() => {
                onViewportChange(v);
                onDismissViewportTooltip?.();
              }}
              className={`p-2 rounded-lg transition-colors ${viewport === v ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'}`}
            >
              {icon}
            </button>
          ))}
          {showViewportTooltip && (
            <div className="absolute left-0 top-full mt-2 z-30 w-48 p-2 bg-zinc-900 text-white text-xs rounded-xl shadow-lg">
              Veja como fica no celular
              <button
                type="button"
                className="block mt-1 text-blue-300 underline"
                onClick={onDismissViewportTooltip}
              >
                Entendi
              </button>
            </div>
          )}
        </div>

        {!previewMode && onUndo && onRedo && (
          <div className="flex items-center bg-zinc-100 rounded-xl p-1 border border-black/5 ml-1">
            <button type="button" title="Desfazer" disabled={!canUndo} onClick={onUndo} className={`p-2 rounded-lg transition-colors ${canUndo ? 'hover:bg-white text-zinc-700' : 'text-zinc-300'}`}>
              <Undo2 className="w-4 h-4" />
            </button>
            <button type="button" title="Refazer" disabled={!canRedo} onClick={onRedo} className={`p-2 rounded-lg transition-colors ${canRedo ? 'hover:bg-white text-zinc-700' : 'text-zinc-300'}`}>
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {!previewMode && !embedded && (
        <div className="flex items-center gap-2">
          {onImport && (
            <label className="btn-secondary cursor-pointer">
              <Upload className="w-4 h-4" /> Importar
              <input type="file" accept=".json" onChange={onImport} className="hidden" />
            </label>
          )}
          {onExport && (
            <button type="button" onClick={onExport} className="btn-secondary relative">
              {exportLocked ? <Lock className="w-4 h-4 text-amber-500" /> : <Download className="w-4 h-4" />}
              Exportar
              {exportLocked && (
                <span className="ml-1 text-[9px] font-bold text-amber-600 uppercase tracking-widest">Pro</span>
              )}
            </button>
          )}
          {(onImport || onExport) && <div className="w-px h-6 bg-black/10 mx-2" />}
          <button type="button" onClick={onClear} className="btn-danger">
            <Trash className="w-4 h-4" /> Limpar
          </button>
          {onSave && (
            <>
              <div className="w-px h-6 bg-black/10 mx-2" />
              <button type="button" onClick={onSave} className="btn-primary">
                <Save className="w-4 h-4" /> {saveLabel}
              </button>
            </>
          )}
        </div>
      )}
      {!previewMode && embedded && onSave && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSave} className="btn-primary">
            <Save className="w-4 h-4" /> {saveLabel}
          </button>
        </div>
      )}
    </div>
  );
}

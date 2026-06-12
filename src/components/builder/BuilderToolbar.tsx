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
  saveLoading?: boolean;
  saveError?: string | null;
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
  compact?: boolean;
}

export function BuilderToolbar({
  previewMode,
  viewport,
  onViewportChange,
  showViewportTooltip,
  onDismissViewportTooltip,
  saveLabel = 'Salvar',
  saveLoading = false,
  saveError = null,
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
  compact = false,
}: BuilderToolbarProps) {
  const viewportButtons: { v: BuilderViewport; icon: React.ReactNode }[] = [
    { v: 'desktop', icon: <Monitor className="w-4 h-4" /> },
    { v: 'tablet', icon: <Tablet className="w-4 h-4" /> },
    { v: 'mobile', icon: <Smartphone className="w-4 h-4" /> },
  ];

  return (
    <div className={`${compact ? 'h-14' : 'h-16'} glass-panel border-b border-black/5 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-20 shadow-sm shrink-0 bg-white/80 relative gap-2`}>
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        {onBack && (
          <button type="button" onClick={onBack} className={`btn-secondary ${compact ? '!px-2.5 !py-2' : 'mr-2'}`}>
            <ChevronLeft className="w-4 h-4" /> {!compact && 'Voltar'}
          </button>
        )}
        <button
          type="button"
          onClick={onTogglePreview}
          className={`btn-secondary ${compact ? '!px-2.5 !py-2' : ''} ${previewMode ? 'bg-zinc-100 text-zinc-900 border-black/10 shadow-inner' : ''}`}
        >
          {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {!compact && (previewMode ? 'Sair do Preview' : 'Preview')}
        </button>

        <div className="relative flex items-center bg-zinc-100 rounded-xl p-0.5 border border-black/5">
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
          <div className="flex items-center bg-zinc-100 rounded-xl p-0.5 border border-black/5">
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
        <div className="flex items-center gap-1 shrink-0">
          {!compact && (onImport || onExport) && (
            <div className="flex items-center bg-zinc-100 rounded-xl p-1 border border-black/5">
              {onImport && (
                <label
                  title="Importar layout (JSON)"
                  aria-label="Importar layout (JSON)"
                  className="p-2 rounded-lg transition-colors text-zinc-700 hover:bg-white hover:text-zinc-900 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <input type="file" accept=".json" onChange={onImport} className="hidden" />
                </label>
              )}
              {onExport && (
                <button
                  type="button"
                  title={exportLocked ? 'Exportar layout — plano Pro' : 'Exportar layout'}
                  aria-label={exportLocked ? 'Exportar layout — plano Pro' : 'Exportar layout'}
                  onClick={onExport}
                  className="relative p-2 rounded-lg transition-colors text-zinc-700 hover:bg-white hover:text-zinc-900"
                >
                  {exportLocked ? <Lock className="w-4 h-4 text-amber-500" /> : <Download className="w-4 h-4" />}
                  {exportLocked && (
                    <span className="absolute top-0.5 right-0.5 text-[7px] font-bold text-amber-600 uppercase leading-none">Pro</span>
                  )}
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            title="Limpar canvas"
            aria-label="Limpar canvas"
            onClick={onClear}
            className="p-2 rounded-xl transition-colors text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100"
          >
            <Trash className="w-4 h-4" />
          </button>
          {onSave && (
            <button
              type="button"
              title={saveError ?? saveLabel}
              aria-label={saveLabel}
              onClick={onSave}
              disabled={saveLoading}
              className="p-2 rounded-xl bg-zinc-900 text-white hover:bg-black transition-all active:scale-[0.97] shadow-lg shadow-black/5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saveLoading ? (
                <span className="block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      )}
      {!previewMode && embedded && onSave && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title={saveError ?? saveLabel}
            aria-label={saveLabel}
            onClick={onSave}
            disabled={saveLoading}
            className="p-2 rounded-xl bg-zinc-900 text-white hover:bg-black transition-all active:scale-[0.97] shadow-lg shadow-black/5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saveLoading ? (
              <span className="block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
      {saveError && !previewMode && (
        <p className="absolute left-1/2 -translate-x-1/2 top-full mt-1 text-xs text-red-600 max-w-md text-center px-2">
          {saveError}
        </p>
      )}
    </div>
  );
}

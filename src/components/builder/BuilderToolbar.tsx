import React from 'react';
import {
  ChevronLeft, Eye, EyeOff, Upload, Download, Trash, Save, Lock,
} from 'lucide-react';

export interface BuilderToolbarProps {
  previewMode: boolean;
  saveLabel?: string;
  onBack?: () => void;
  onTogglePreview: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  /** Quando true, o botão Exportar aparece com ícone de cadeado. */
  exportLocked?: boolean;
  onClear: () => void;
  onSave?: () => void;
}

/**
 * Toolbar superior do canvas do Builder.
 *
 * Encapsula os botões de voltar, preview, importar, exportar, limpar e salvar.
 * Nenhum estado local: todo o comportamento é controlado via props, preservando
 * a mesma interação do componente original.
 */
export function BuilderToolbar({
  previewMode,
  saveLabel = 'Salvar',
  onBack,
  onTogglePreview,
  onImport,
  onExport,
  exportLocked = false,
  onClear,
  onSave,
}: BuilderToolbarProps) {
  return (
    <div className="h-16 glass-panel border-b border-black/5 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm shrink-0 bg-white/80">
      <div className="flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="btn-secondary mr-2">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
        )}
        <button
          onClick={onTogglePreview}
          className={`btn-secondary ${previewMode ? 'bg-zinc-100 text-zinc-900 border-black/10 shadow-inner' : ''}`}
        >
          {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {previewMode ? 'Sair do Preview' : 'Preview'}
        </button>
      </div>
      {!previewMode && (
        <div className="flex items-center gap-2">
          <label className="btn-secondary cursor-pointer">
            <Upload className="w-4 h-4" /> Importar
            <input type="file" accept=".json" onChange={onImport} className="hidden" />
          </label>
          <button onClick={onExport} className="btn-secondary relative">
            {exportLocked ? <Lock className="w-4 h-4 text-amber-500" /> : <Download className="w-4 h-4" />}
            Exportar
            {exportLocked && (
              <span className="ml-1 text-[9px] font-bold text-amber-600 uppercase tracking-widest">Pro</span>
            )}
          </button>
          <div className="w-px h-6 bg-black/10 mx-2" />
          <button onClick={onClear} className="btn-danger">
            <Trash className="w-4 h-4" /> Limpar
          </button>
          {onSave && (
            <>
              <div className="w-px h-6 bg-black/10 mx-2" />
              <button onClick={onSave} className="btn-primary">
                <Save className="w-4 h-4" /> {saveLabel}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

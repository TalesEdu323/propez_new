import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, RotateCcw, X } from 'lucide-react';

export interface ContratoPdfUploadZoneProps {
  uploading: boolean;
  fileName?: string | null;
  pageCount?: number;
  fileSizeBytes?: number | null;
  uploadError?: string | null;
  uploadProgress?: number;
  onSelectFile: (file: File) => void;
  onValidationError?: (message: string) => void;
  onRemove?: () => void;
}

function formatSizeMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2);
}

export function ContratoPdfUploadZone({
  uploading,
  fileName,
  pageCount = 0,
  fileSizeBytes,
  uploadError,
  uploadProgress = 0,
  onSelectFile,
  onValidationError,
  onRemove,
}: ContratoPdfUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasFile = !!fileName;

  const openPicker = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFile = (file: File | undefined) => {
    if (!file || uploading) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      onValidationError?.('Apenas arquivos PDF são aceitos.');
      return;
    }
    onSelectFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const progressWidth =
    uploading && uploadProgress > 0
      ? `${uploadProgress}%`
      : uploading
        ? undefined
        : hasFile && !uploadError
          ? '100%'
          : undefined;

  const zoneClass = hasFile
    ? 'border-emerald-300 bg-emerald-50/60 py-4 px-4'
    : isDragging
      ? 'border-emerald-500 bg-emerald-100/60 scale-[1.02] py-12 px-6 text-center cursor-pointer'
      : 'border-blue-600 hover:border-emerald-400 hover:bg-emerald-50/40 py-12 px-6 text-center cursor-pointer';

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 sm:p-8 space-y-4">
      <div>
        <h3 className="text-xl font-bold text-zinc-900">Documento</h3>
        <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
          Anexe o PDF clicando na área tracejada ou arrastando para cima dela. O arquivo será o
          documento final do modelo de contrato.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-900 mb-2">
          Qual documento será usado no modelo?
        </label>
        <div
          role="button"
          tabIndex={0}
          className={`border-2 border-dashed rounded-lg transition-all duration-300 ${zoneClass} ${uploading ? 'pointer-events-none opacity-80' : ''}`}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPicker();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          {!hasFile && !uploading && (
            <>
              <FileText className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <p className="text-base font-medium text-zinc-900 mb-1">
                Arraste e solte aqui ou clique para selecionar
              </p>
              <p className="text-xs text-zinc-500 mt-2">PDF — até 10 MB por arquivo</p>
            </>
          )}

          {(hasFile || uploading) && (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <div
                className={`rounded-lg border p-2.5 transition-colors ${
                  uploadError
                    ? 'border-red-300 bg-red-50'
                    : uploading
                      ? 'border-blue-200 bg-blue-50/40'
                      : 'border-emerald-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`flex-shrink-0 p-2 rounded-lg border ${
                        uploadError
                          ? 'bg-red-100 border-red-300'
                          : uploading
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {uploadError ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : uploading ? (
                        <FileText className="h-5 w-5 text-blue-600" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 truncate text-sm">
                        {fileName || 'Enviando PDF…'}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {fileSizeBytes != null && `${formatSizeMb(fileSizeBytes)} MB`}
                        {uploading && uploadProgress > 0 && ` · ${uploadProgress}%`}
                        {uploading && uploadProgress === 0 && ' · Enviando…'}
                        {!uploading && !uploadError && hasFile && ' · Enviado'}
                        {!uploading && pageCount > 0 && (
                          <span>
                            {' '}
                            · {pageCount} {pageCount === 1 ? 'página' : 'páginas'}
                          </span>
                        )}
                      </p>
                      {(uploading || (!uploadError && hasFile)) && (
                        <div className="h-1.5 mt-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              uploading
                                ? progressWidth
                                  ? 'bg-blue-500'
                                  : 'bg-blue-500 w-2/3 animate-pulse'
                                : 'bg-emerald-500 w-full'
                            }`}
                            style={progressWidth ? { width: progressWidth } : undefined}
                          />
                        </div>
                      )}
                      {uploadError && (
                        <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {uploadError && (
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={openPicker}
                        className="h-8 w-8 p-0 inline-flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Tentar novamente"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    {onRemove && hasFile && !uploading && (
                      <button
                        type="button"
                        onClick={onRemove}
                        className="h-8 w-8 p-0 inline-flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        title="Remover"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {!uploading && (
                <button
                  type="button"
                  onClick={openPicker}
                  className="w-full mt-2 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {hasFile ? 'Substituir PDF' : 'Selecionar PDF'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

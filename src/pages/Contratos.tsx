import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Search, FileText, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { store, ContratoTemplate } from '../lib/store';
import { useContratos, useUserConfig } from '../hooks/useStoreEntity';
import { formatDateBR } from '../lib/format';
import { AiBriefPromptModal } from '../components/ia/AiBriefPromptModal';
import { api, apiFetch, ApiError } from '../lib/apiClient';
import { blobToPdfPreviewSource, isPdfBuffer } from '../lib/pdfPreview';
import type { PdfPreviewSource } from '../lib/pdfPreview';
import { titleFromPdfFilename } from '../lib/contratoPdfTitle';
import {
  finalizeContratoPdfUpload,
  MULTIPART_FALLBACK_MAX_BYTES,
  shouldUseClientBlobUpload,
  uploadContratoPdfToBlob,
} from '../lib/client/contratoBlobUpload';
import { buildPdfViewUrl, contratoHasRemotePdf } from '../lib/pdfViewUrl';
import type { Marcador } from '../lib/documents/positioningTypes';
import {
  defaultTemplateSigners,
  marcadoresToConfig,
  parseSavedSignatureConfig,
  templateSignersToPositioning,
  validateTemplateSignatureConfig,
} from '../lib/signatureConfig';
import { ContratoOriginStep } from './contratos/ContratoOriginStep';
import { ContratoContentStep } from './contratos/ContratoContentStep';
import { ContratoSignatureStep } from './contratos/ContratoSignatureStep';
import { ListingViewToggle } from '../components/listing/ListingViewToggle';
import { useListingViewPref } from '../hooks/useListingViewPref';
import { LISTING_GRID_CLASS, LISTING_LIST_CLASS } from '../components/listing/listingLayout';

const CONTRATOS_VIEW_KEY = 'listing_view:contratos';

type WizardStep = 'choose' | 'content' | 'signature';

export default function Contratos() {
  const contratos = useContratos();
  const userConfig = useUserConfig();
  const [searchTerm, setSearchTerm] = useState('');
  const [listView, setListView] = useListingViewPref(CONTRATOS_VIEW_KEY, 'grid');
  const [isEditing, setIsEditing] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('choose');
  const [currentContrato, setCurrentContrato] = useState<Partial<ContratoTemplate> | null>(null);
  const [sourceType, setSourceType] = useState<'text' | 'pdf'>('text');
  const [marcadores, setMarcadores] = useState<Marcador[]>([]);
  const [selectedSignerId, setSelectedSignerId] = useState<string | null>('client');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewFile, setPreviewFile] = useState<PdfPreviewSource | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFileSize, setPendingFileSize] = useState<number | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const loadedPreviewForRef = useRef<string | null>(null);

  const textoFingerprint = currentContrato?.texto
    ? `${currentContrato.texto.length}:${currentContrato.texto.slice(0, 32)}:${currentContrato.texto.slice(-16)}`
    : '';
  const previewKey = currentContrato
    ? `${currentContrato.id}:${currentContrato.sourceType}:${currentContrato.pageCount}:${currentContrato.pdfFileName}:${currentContrato.pdfPath ?? ''}:${textoFingerprint}`
    : '';

  const isNewContrato = isEditing && !currentContrato?.id;
  const pageCount = currentContrato?.pageCount ?? 1;
  const orgName = userConfig.nome || 'Empresa';
  const templateSigners = defaultTemplateSigners(orgName);
  const positioningSigners = templateSignersToPositioning(templateSigners);

  const shouldLoadPreview = useCallback(
    (contrato: Partial<ContratoTemplate> | null, srcType: 'text' | 'pdf'): boolean => {
      if (!contrato?.id) return false;
      if (srcType === 'text') return true;
      return (
        contrato.sourceType === 'pdf' &&
        ((contrato.pageCount ?? 0) > 0 || !!contrato.pdfFileName)
      );
    },
    [],
  );

  const loadPreview = useCallback(async (
    contratoId: string,
    opts?: { force?: boolean; sourceType?: 'text' | 'pdf'; pdfPath?: string | null },
  ) => {
    if (!opts?.force && loadedPreviewForRef.current === previewKey && previewKey) {
      return;
    }

    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const applyPdfBlob = async (pdfBlob: Blob) => {
        const source = await blobToPdfPreviewSource(pdfBlob);
        if (!source) {
          setPreviewFile(null);
          loadedPreviewForRef.current = null;
          setPreviewError('O arquivo não é um PDF válido.');
          return;
        }
        setPreviewFile(source);
        loadedPreviewForRef.current = previewKey || contratoId;
        setPreviewError(null);
      };

      const remotePdfPath = opts?.pdfPath ?? currentContrato?.pdfPath;
      if (remotePdfPath && contratoHasRemotePdf(remotePdfPath)) {
        const res = await fetch(buildPdfViewUrl(remotePdfPath), {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) {
          setPreviewFile(null);
          loadedPreviewForRef.current = null;
          setPreviewError(
            res.status === 404
              ? 'PDF não encontrado no armazenamento. Envie o arquivo novamente.'
              : 'Não foi possível carregar o PDF do armazenamento.',
          );
          return;
        }
        const blob = await res.blob();
        if (blob.size < 5) {
          setPreviewFile(null);
          loadedPreviewForRef.current = null;
          setPreviewError('O servidor não retornou um PDF válido.');
          return;
        }
        await applyPdfBlob(blob);
        return;
      }

      const fetchPdf = (path: string) => {
        const run = () =>
          apiFetch(`${path}?_=${Date.now()}`, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
          });
        return run().then(async (res) => (res.status === 304 ? run() : res));
      };

      let res = await fetchPdf(`/api/contratos/${contratoId}/preview-pdf`);
      if (!res.ok && opts?.sourceType === 'pdf') {
        res = await fetchPdf(`/api/contratos/${contratoId}/pdf`);
      }

      if (!res.ok) {
        if (res.status === 401) {
          setPreviewFile(null);
          loadedPreviewForRef.current = null;
          setPreviewError('Sessão expirada. Faça login novamente.');
          return;
        }
        const err = await res.json().catch(() => ({}));
        const msg =
          typeof err === 'object' && err && 'error' in err && typeof err.error === 'string'
            ? err.error
            : 'Não foi possível carregar o preview do contrato.';
        setPreviewFile(null);
        loadedPreviewForRef.current = null;
        setPreviewError(msg);
        return;
      }

      const blob = await res.blob();

      if (blob.size < 5) {
        setPreviewFile(null);
        loadedPreviewForRef.current = null;
        setPreviewError('O servidor não retornou um PDF válido.');
        return;
      }

      const buf = await blob.arrayBuffer();
      if (!isPdfBuffer(buf)) {
        setPreviewFile(null);
        loadedPreviewForRef.current = null;
        setPreviewError('PDF não encontrado ou inválido. Envie o arquivo novamente na etapa de conteúdo.');
        return;
      }

      const source = await blobToPdfPreviewSource(blob);
      if (!source) {
        setPreviewFile(null);
        loadedPreviewForRef.current = null;
        setPreviewError('O servidor não retornou um PDF válido.');
        return;
      }

      setPreviewFile(source);
      loadedPreviewForRef.current = previewKey || contratoId;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setPreviewFile(null);
      loadedPreviewForRef.current = null;
      if (e instanceof ApiError && e.status === 401) {
        setPreviewError('Sessão expirada. Faça login novamente.');
      } else {
        setPreviewError(
          e instanceof Error ? e.message : 'Não foi possível carregar o preview do contrato.',
        );
      }
    } finally {
      if (previewAbortRef.current === controller) {
        setPreviewLoading(false);
      }
    }
  }, [previewKey, currentContrato?.pdfPath]);

  useEffect(() => {
    loadedPreviewForRef.current = null;
  }, [sourceType]);

  useEffect(() => {
    if (!isEditing || wizardStep === 'choose') {
      setPreviewFile(null);
      setPreviewError(null);
      loadedPreviewForRef.current = null;
      return;
    }
    const contratoId = currentContrato?.id;
    if (shouldLoadPreview(currentContrato, sourceType) && contratoId) {
      if (loadedPreviewForRef.current === previewKey && previewKey) {
        return;
      }
      void loadPreview(contratoId, { sourceType, pdfPath: currentContrato?.pdfPath });
    } else if (sourceType === 'pdf') {
      setPreviewFile(null);
      setPreviewError(null);
      setPreviewLoading(false);
      loadedPreviewForRef.current = null;
    }
  }, [isEditing, wizardStep, previewKey, sourceType, loadPreview, shouldLoadPreview, currentContrato?.id]);

  useEffect(() => {
    if (!currentContrato) return;
    const cfg = parseSavedSignatureConfig(
      currentContrato.signatureConfig,
      orgName,
      pageCount,
    );
    setMarcadores(cfg.fields);
  }, [currentContrato?.id, currentContrato?.signatureConfig, orgName, pageCount]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  };

  const resetEditor = () => {
    previewAbortRef.current?.abort();
    loadedPreviewForRef.current = null;
    setIsEditing(false);
    setCurrentContrato(null);
    setWizardStep('choose');
    setMarcadores([]);
    setSelectedSignerId('client');
    setPreviewFile(null);
    setPreviewError(null);
  };

  const handleAiContract = async (result: { titulo: string; texto: string }) => {
    loadedPreviewForRef.current = null;
    setSourceType('text');
    setCurrentContrato((prev) => ({
      ...prev,
      titulo: result.titulo,
      texto: result.texto,
      sourceType: 'text',
    }));

    try {
      const saved = await ensureSavedDraft({ titulo: result.titulo, texto: result.texto });
      if (!saved?.id) return;

      loadedPreviewForRef.current = null;
      await loadPreview(saved.id, { force: true, sourceType: 'text' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar rascunho do contrato';
      showToast(msg);
    }
  };

  const ensureSavedDraft = async (opts?: {
    titulo?: string;
    texto?: string;
  }): Promise<ContratoTemplate | null> => {
    const titulo = (opts?.titulo ?? currentContrato?.titulo)?.trim();
    if (!titulo) {
      showToast('Informe o título do contrato.');
      return null;
    }

    if (currentContrato?.id) {
      const patch: { titulo?: string; texto?: string; sourceType?: 'text' | 'pdf' } = {};
      if (opts?.titulo && opts.titulo !== currentContrato.titulo?.trim()) {
        patch.titulo = opts.titulo;
      }
      if (opts?.texto !== undefined) {
        patch.texto = opts.texto;
        patch.sourceType = 'text';
      }
      if (Object.keys(patch).length > 0) {
        const updated = await api.patch<ContratoTemplate>(`/api/contratos/${currentContrato.id}`, patch);
        setCurrentContrato(updated);
        store.saveContratos(
          contratos
            .filter((c): c is ContratoTemplate => !!c?.id)
            .map((c) => (c.id === updated.id ? updated : c)),
        );
        return updated;
      }
      return { ...currentContrato, titulo } as ContratoTemplate;
    }

    const saved = await api.post<ContratoTemplate>('/api/contratos', {
      titulo,
      texto: opts?.texto ?? currentContrato?.texto ?? '',
      sourceType: sourceType === 'pdf' ? 'text' : sourceType,
    });
    setCurrentContrato(saved);
    store.saveContratos([
      saved,
      ...contratos.filter((c): c is ContratoTemplate => !!c?.id && c.id !== saved.id),
    ]);
    return saved;
  };

  const handleUploadPdf = async (file: File) => {
    const inferred = titleFromPdfFilename(file.name);
    const titulo = currentContrato?.titulo?.trim() || inferred;

    if (!currentContrato?.titulo?.trim()) {
      setCurrentContrato((prev) => ({ ...prev, titulo }));
    }

    setUploadError(null);
    setPendingFileSize(file.size);
    setPendingFileName(file.name);

    const saved = await ensureSavedDraft({ titulo });
    if (!saved) return;

    setUploading(true);
    try {
      let data: ContratoTemplate & { error?: string; pageCount?: number };

      const useBlob = await shouldUseClientBlobUpload();
      if (useBlob) {
        const { blobUrl } = await uploadContratoPdfToBlob(saved.id, file);
        const finalized = await finalizeContratoPdfUpload(saved.id, {
          blobUrl,
          fileName: file.name,
          fileSize: file.size,
        });
        data = finalized as ContratoTemplate & { pageCount?: number };
      } else {
        if (import.meta.env.PROD && file.size > MULTIPART_FALLBACK_MAX_BYTES) {
          throw new Error(
            'PDF muito grande para o modo de upload atual. Contate o suporte (armazenamento Blob não configurado).',
          );
        }
        const form = new FormData();
        form.append('file', file);
        const res = await apiFetch(`/api/contratos/${saved.id}/upload-pdf`, {
          method: 'POST',
          body: form,
        });
        data = (await res.json().catch(() => ({}))) as ContratoTemplate & {
          error?: string;
          pageCount?: number;
        };
        if (!res.ok) throw new Error(data.error || 'Falha no upload');
      }

      if (!data.id) throw new Error('Resposta inválida do servidor.');
      const updated: ContratoTemplate = {
        ...saved,
        ...data,
        titulo: saved.titulo || titulo,
        sourceType: 'pdf',
        pdfPath: data.pdfPath ?? saved.pdfPath,
        pdfFileName: data.pdfFileName ?? file.name,
        pageCount: data.pageCount ?? saved.pageCount ?? 1,
      };
      setCurrentContrato(updated);
      setSourceType('pdf');
      setUploadError(null);
      setPendingFileName(null);
      store.saveContratos(
        contratos.some((c) => c?.id === updated.id)
          ? contratos
              .filter((c): c is ContratoTemplate => !!c?.id)
              .map((c) => (c.id === updated.id ? updated : c))
          : [updated, ...contratos.filter((c): c is ContratoTemplate => !!c?.id)],
      );
      loadedPreviewForRef.current = null;
      await loadPreview(updated.id, {
        force: true,
        sourceType: 'pdf',
        pdfPath: updated.pdfPath,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar PDF';
      setUploadError(msg);
      showToast(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePdf = () => {
    previewAbortRef.current?.abort();
    loadedPreviewForRef.current = null;
    setPreviewFile(null);
    setPreviewError(null);
    setUploadError(null);
    setPendingFileSize(null);
    setPendingFileName(null);
    setCurrentContrato((prev) =>
      prev
        ? {
            ...prev,
            sourceType: 'text',
            pdfFileName: undefined,
            pageCount: undefined,
          }
        : prev,
    );
    setSourceType('pdf');
  };

  const persistContent = async (): Promise<ContratoTemplate | null> => {
    if (!currentContrato?.titulo?.trim()) {
      showToast('Preencha o título do contrato.');
      return null;
    }
    if (sourceType === 'text' && !currentContrato.texto?.trim()) {
      showToast('Preencha o texto do contrato ou envie um PDF.');
      return null;
    }
    if (sourceType === 'pdf' && currentContrato.sourceType !== 'pdf') {
      showToast('Envie um arquivo PDF antes de continuar.');
      return null;
    }

    const draft = await ensureSavedDraft();
    if (!draft) return null;

    if (currentContrato.id) {
      const updated = await api.patch<ContratoTemplate>(`/api/contratos/${draft.id}`, {
        titulo: currentContrato.titulo.trim(),
        texto: sourceType === 'text' ? currentContrato.texto : '',
        sourceType,
      });
      setCurrentContrato(updated);
      if (updated?.id) {
        store.saveContratos(
          contratos
            .filter((c): c is ContratoTemplate => !!c?.id)
            .map((c) => (c.id === updated.id ? updated : c)),
        );
      }
      return updated;
    }
    return draft;
  };

  const handleAdvanceToSignature = async () => {
    const saved = await persistContent();
    if (!saved?.id) return;
    const savedCfg = parseSavedSignatureConfig(saved.signatureConfig, orgName, pageCount);
    if (savedCfg.fields.length === 0) setMarcadores([]);
    loadedPreviewForRef.current = null;
    await loadPreview(saved.id, { force: true, sourceType, pdfPath: saved.pdfPath });
    setWizardStep('signature');
  };

  const handleReloadPreview = useCallback(() => {
    if (!currentContrato?.id) return;
    loadedPreviewForRef.current = null;
    void loadPreview(currentContrato.id, {
      force: true,
      sourceType,
      pdfPath: currentContrato.pdfPath,
    });
  }, [currentContrato?.id, currentContrato?.pdfPath, loadPreview, sourceType]);

  const handleConfirmSave = async () => {
    const saved = await persistContent();
    if (!saved) return;

    const signatureConfig = marcadoresToConfig(marcadores, templateSigners);
    const err = validateTemplateSignatureConfig(signatureConfig);
    if (err) {
      showToast(err);
      return;
    }

    try {
      const updated = await api.patch<ContratoTemplate>(`/api/contratos/${saved.id}`, {
        signatureConfig,
      });
      if (updated?.id) {
        store.saveContratos(
          contratos
            .filter((c): c is ContratoTemplate => !!c?.id)
            .map((c) => (c.id === updated.id ? updated : c)),
        );
      }
      resetEditor();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar contrato');
    }
  };

  const handleDelete = (id: string) => {
    store.saveContratos(contratos.filter((c): c is ContratoTemplate => !!c?.id && c.id !== id));
  };

  const filteredContratos = contratos.filter(
    (c): c is ContratoTemplate =>
      !!c?.id && !!c.titulo && c.titulo.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stepLabels: Record<WizardStep, string> = {
    choose: '1 Origem',
    content: '2 Conteúdo',
    signature: '3 Assinaturas',
  };

  const headerCta = () => {
    if (wizardStep === 'content') {
      return (
        <button
          type="button"
          onClick={() => void handleAdvanceToSignature()}
          className="bg-[#0a0a0a] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800"
        >
          Salvar Modelo
        </button>
      );
    }
    if (wizardStep === 'signature') {
      return (
        <button
          type="button"
          onClick={() => void handleConfirmSave()}
          className="bg-[#0a0a0a] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800"
        >
          Confirmar e salvar
        </button>
      );
    }
    return null;
  };

  return (
    <>
      {isEditing ? (
        <div className="flex flex-col h-full bg-white">
          <div className="p-6 border-b border-black/5 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (wizardStep === 'signature') setWizardStep('content');
                  else if (wizardStep === 'content' && isNewContrato) setWizardStep('choose');
                  else resetEditor();
                }}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-500" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
                  {currentContrato?.id ? 'Editar Contrato' : 'Novo Modelo de Contrato'}
                </h1>
                <p className="text-xs text-zinc-500">
                  {stepLabels[wizardStep]}
                  {wizardStep !== 'choose' && ' · '}
                  {wizardStep === 'content' && (sourceType === 'pdf' ? 'PDF' : 'Texto')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {wizardStep === 'content' && currentContrato?.id && (
                <button
                  type="button"
                  onClick={() => {
                    void persistContent().then(async (s) => {
                      if (s?.id) {
                        loadedPreviewForRef.current = null;
                        await loadPreview(s.id, {
                          force: true,
                          sourceType,
                          pdfPath: s.pdfPath,
                        });
                        setWizardStep('signature');
                      }
                    });
                  }}
                  className="text-sm text-zinc-600 hover:text-zinc-900 font-medium"
                >
                  Ajustar assinaturas
                </button>
              )}
              {headerCta()}
            </div>
          </div>

          {toast && (
            <div className="mx-6 mt-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-900">
              {toast}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {wizardStep === 'choose' && (
              <ContratoOriginStep
                onChooseText={() => {
                  setSourceType('text');
                  setCurrentContrato((p) => ({ ...p, sourceType: 'text' }));
                  setWizardStep('content');
                }}
                onChoosePdf={() => {
                  setSourceType('pdf');
                  setCurrentContrato((p) => ({ ...p, sourceType: 'pdf' }));
                  setWizardStep('content');
                }}
              />
            )}
            {wizardStep === 'content' && currentContrato && (
              <ContratoContentStep
                currentContrato={currentContrato}
                onContratoChange={(patch) => setCurrentContrato({ ...currentContrato, ...patch })}
                sourceType={sourceType}
                isNewContrato={!!isNewContrato}
                onOpenAi={() => setAiOpen(true)}
                uploading={uploading}
                uploadError={uploadError}
                pendingFileSize={pendingFileSize}
                pendingFileName={pendingFileName}
                onUploadPdf={(f) => void handleUploadPdf(f)}
                onRemovePdf={handleRemovePdf}
                previewFile={previewFile}
                previewLoading={previewLoading}
                previewError={previewError}
                onReloadPreview={handleReloadPreview}
              />
            )}
            {wizardStep === 'signature' && (
              <ContratoSignatureStep
                signers={positioningSigners}
                marcadores={marcadores}
                setMarcadores={setMarcadores}
                selectedSignerId={selectedSignerId}
                onSelectSigner={setSelectedSignerId}
                documentPages={pageCount}
                currentPage={currentPage}
                onCurrentPageChange={setCurrentPage}
                pdfFile={previewFile}
                previewLoading={previewLoading}
                previewError={previewError}
                onNotify={showToast}
                onReloadPreview={handleReloadPreview}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-full bg-[#F5F5F7] font-sans selection:bg-zinc-200">
          <div className="page-container">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 mb-4">
              <div>
                <h1 className="page-title">Contratos.</h1>
                <p className="text-zinc-400 mt-4 font-medium">
                  Gerencie modelos de contrato, PDFs e posição das assinaturas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCurrentContrato({ titulo: '', texto: '', sourceType: 'text' });
                  setSourceType('text');
                  setWizardStep('choose');
                  setMarcadores([]);
                  setIsEditing(true);
                }}
                className="btn-primary w-full sm:w-fit"
              >
                <Plus className="w-5 h-5" /> Novo Contrato
              </button>
            </div>

            <div className="apple-card overflow-hidden mx-0 !p-0">
              <div className="p-6 md:p-10 border-b border-zinc-100/50 bg-zinc-50/30">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  <div className="relative max-w-md w-full flex-1">
                    <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" />
                    <input
                      type="text"
                      placeholder="Buscar contratos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="glass-input pl-12 pr-6 py-4 w-full text-sm font-medium"
                    />
                  </div>
                  <ListingViewToggle
                    view={listView}
                    onChange={setListView}
                  />
                </div>
              </div>

              {filteredContratos.length === 0 ? (
                <div className="text-center py-20 sm:py-32 px-6">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-50 rounded-2xl sm:rounded-[2rem] border border-black/[0.02] flex items-center justify-center mx-auto mb-8 sm:mb-10">
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-200" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight mb-2 sm:mb-3">
                    Nenhum contrato encontrado
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm font-medium mb-10 sm:mb-12 max-w-xs mx-auto">
                    Crie modelos de contrato para anexar às suas propostas.
                  </p>
                </div>
              ) : (
                <div
                  className={
                    listView === 'grid'
                      ? `${LISTING_GRID_CLASS} p-6 sm:p-10`
                      : `${LISTING_LIST_CLASS} p-4 sm:p-6`
                  }
                >
                  <AnimatePresence mode="popLayout">
                    {filteredContratos.map((contrato, index) => {
                      const openEditor = () => {
                        setCurrentContrato(contrato);
                        setSourceType(contrato.sourceType === 'pdf' ? 'pdf' : 'text');
                        setWizardStep('content');
                        setIsEditing(true);
                      };
                      if (listView === 'list') {
                        return (
                          <motion.div
                            key={contrato.id}
                            layout
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="group flex cursor-pointer items-center gap-4 rounded-xl border border-zinc-100 bg-white p-4 hover:border-zinc-200 hover:shadow-md transition-all"
                            onClick={openEditor}
                          >
                            <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-zinc-900 truncate">{contrato.titulo}</div>
                              <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">
                                {contrato.sourceType === 'pdf' ? 'PDF' : 'Texto'}
                                {contrato.signatureConfig ? ' · Assinatura' : ''}
                              </div>
                            </div>
                            <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest shrink-0 hidden sm:block">
                              {formatDateBR(contrato.data_criacao)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
                          </motion.div>
                        );
                      }
                      return (
                      <motion.div
                        key={contrato.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className="apple-card apple-card-hover group cursor-pointer !p-6 sm:!p-8 flex flex-col h-full"
                        onClick={openEditor}
                      >
                        <div className="flex justify-between items-start mb-6 sm:mb-8">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-zinc-50 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all duration-500 border border-black/[0.02]">
                            <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(contrato.id);
                            }}
                            className="p-2.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all md:opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              contrato.sourceType === 'pdf'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {contrato.sourceType === 'pdf' ? 'PDF' : 'Texto'}
                          </span>
                          {contrato.signatureConfig ? (
                            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                              Assinatura
                            </span>
                          ) : null}
                        </div>

                        <h3 className="text-lg sm:text-xl font-semibold text-zinc-900 mb-2 sm:mb-3 group-hover:text-zinc-900 transition-colors line-clamp-1 tracking-tight">
                          {contrato.titulo}
                        </h3>
                        <p className="text-zinc-400 text-xs sm:text-sm mb-6 sm:mb-8 line-clamp-3 leading-relaxed font-medium flex-grow">
                          {contrato.sourceType === 'pdf'
                            ? contrato.pdfFileName || 'Documento PDF'
                            : (contrato.texto || '').replace(/<[^>]*>/g, '').substring(0, 150) + '...'}
                        </p>

                        <div className="flex items-center justify-between pt-5 sm:pt-6 border-t border-zinc-100/50">
                          <span className="text-[8px] sm:text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                            {formatDateBR(contrato.data_criacao)}
                          </span>
                          <div className="flex items-center gap-2 text-zinc-300 group-hover:text-zinc-900 transition-all">
                            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest">
                              Editar
                            </span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AiBriefPromptModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        mode="contract"
        onContractGenerated={handleAiContract}
      />
    </>
  );
}

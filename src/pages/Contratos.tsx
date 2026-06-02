import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Search, FileText, Trash2, ChevronRight, ArrowLeft, Sparkles, Upload, FileType2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { store, ContratoTemplate } from '../lib/store';
import ContractEditor from '../components/ContractEditor';
import { useContratos, useUserConfig } from '../hooks/useStoreEntity';
import { createId } from '../lib/ids';
import { formatDateBR } from '../lib/format';
import { AiBriefPromptModal } from '../components/ia/AiBriefPromptModal';
import {
  SignaturePositioningPanel,
  resolveSignatureField,
  type SignatureFieldConfig,
} from '../components/contratos/SignaturePositioningPanel';
import { api } from '../lib/apiClient';

type SourceTab = 'text' | 'pdf';

export default function Contratos() {
  const contratos = useContratos();
  const userConfig = useUserConfig();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentContrato, setCurrentContrato] = useState<Partial<ContratoTemplate> | null>(null);
  const [sourceTab, setSourceTab] = useState<SourceTab>('text');
  const [signatureField, setSignatureField] = useState<SignatureFieldConfig>(resolveSignatureField(null));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNewContrato = isEditing && !currentContrato?.id;
  const pageCount = currentContrato?.pageCount ?? 1;

  const loadPreview = useCallback(async (contratoId: string) => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const blob = await api.getBlob(`/api/contratos/${contratoId}/preview-pdf`);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch {
      setPreviewError('Não foi possível carregar o preview do contrato.');
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isEditing || !currentContrato?.id) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    void loadPreview(currentContrato.id);
    return () => {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [isEditing, currentContrato?.id, currentContrato?.sourceType, loadPreview]);

  useEffect(() => {
    if (currentContrato?.signatureConfig) {
      setSignatureField(resolveSignatureField(currentContrato.signatureConfig));
    }
  }, [currentContrato?.id, currentContrato?.signatureConfig]);

  const handleAiContract = (result: { titulo: string; texto: string }) => {
    setCurrentContrato((prev) => ({
      ...prev,
      titulo: result.titulo,
      texto: result.texto,
      sourceType: 'text',
    }));
    setSourceTab('text');
  };

  const ensureSavedDraft = async (): Promise<ContratoTemplate | null> => {
    if (!currentContrato?.titulo?.trim()) {
      alert('Informe o título do contrato.');
      return null;
    }

    if (currentContrato.id) {
      return currentContrato as ContratoTemplate;
    }

    const draft: ContratoTemplate = {
      id: createId(),
      titulo: currentContrato.titulo.trim(),
      texto: currentContrato.texto || '',
      sourceType: sourceTab,
      data_criacao: new Date().toISOString(),
    };
    const saved = await api.post<ContratoTemplate>('/api/contratos', {
      titulo: draft.titulo,
      texto: draft.texto,
      sourceType: sourceTab,
    });
    setCurrentContrato(saved);
    store.saveContratos([saved, ...contratos.filter((c) => c.id !== saved.id)]);
    return saved;
  };

  const handleUploadPdf = async (file: File) => {
    const saved = await ensureSavedDraft();
    if (!saved) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/contratos/${saved.id}/upload-pdf`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      const data = (await res.json().catch(() => ({}))) as ContratoTemplate & { error?: string; pageCount?: number };
      if (!res.ok) throw new Error(data.error || 'Falha no upload');
      const updated: ContratoTemplate = {
        ...saved,
        ...data,
        sourceType: 'pdf',
        pageCount: data.pageCount ?? saved.pageCount ?? 1,
      };
      setCurrentContrato(updated);
      setSourceTab('pdf');
      store.saveContratos(contratos.map((c) => (c.id === updated.id ? updated : c)).concat(
        contratos.some((c) => c.id === updated.id) ? [] : [updated],
      ));
      void loadPreview(updated.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentContrato?.titulo?.trim()) {
      alert('Preencha o título do contrato.');
      return;
    }

    if (sourceTab === 'text' && !currentContrato.texto?.trim()) {
      alert('Preencha o texto do contrato ou envie um PDF.');
      return;
    }

    if (sourceTab === 'pdf' && currentContrato.sourceType !== 'pdf') {
      alert('Envie um arquivo PDF antes de salvar.');
      return;
    }

    const signatureConfig = { clientField: signatureField };

    try {
      if (currentContrato.id) {
        const updated = await api.patch<ContratoTemplate>(`/api/contratos/${currentContrato.id}`, {
          titulo: currentContrato.titulo.trim(),
          texto: sourceTab === 'text' ? currentContrato.texto : '',
          sourceType: sourceTab,
          signatureConfig,
        });
        store.saveContratos(contratos.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await api.post<ContratoTemplate>('/api/contratos', {
          titulo: currentContrato.titulo.trim(),
          texto: sourceTab === 'text' ? currentContrato.texto : '',
          sourceType: sourceTab,
        });
        const withSig = await api.patch<ContratoTemplate>(`/api/contratos/${created.id}`, {
          signatureConfig,
        });
        store.saveContratos([withSig, ...contratos]);
      }

      setIsEditing(false);
      setCurrentContrato(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar contrato');
    }
  };

  const handleDelete = (id: string) => {
    store.saveContratos(contratos.filter((c) => c.id !== id));
  };

  const filteredContratos = contratos.filter((c) =>
    c.titulo.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      {isEditing ? (
        <div className="flex flex-col h-full bg-white">
          <div className="p-6 border-b border-black/5 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setCurrentContrato(null);
                }}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-500" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
                  {currentContrato?.id ? 'Editar Contrato' : 'Novo Modelo de Contrato'}
                </h1>
                <p className="text-xs text-zinc-500">Defina o conteúdo e a posição da assinatura do cliente</p>
              </div>
            </div>
            <button
              onClick={() => void handleSave()}
              className="bg-[#0a0a0a] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 active:scale-[0.98]"
            >
              Salvar Modelo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 border-b border-black/5 space-y-4 max-w-5xl mx-auto w-full">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Título do Modelo
              </label>
              <input
                type="text"
                value={currentContrato?.titulo || ''}
                onChange={(e) => setCurrentContrato({ ...currentContrato, titulo: e.target.value })}
                placeholder="Ex: Contrato de Prestação de Serviços Web"
                className="w-full text-2xl font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSourceTab('text')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                    sourceTab === 'text'
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-600 border-black/10'
                  }`}
                >
                  <FileType2 className="w-4 h-4 inline mr-2" />
                  Contrato em texto
                </button>
                <button
                  type="button"
                  onClick={() => setSourceTab('pdf')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                    sourceTab === 'pdf'
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-600 border-black/10'
                  }`}
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  Upload PDF
                </button>
              </div>

              {sourceTab === 'text' && isNewContrato && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <div>
                    <p className="text-sm font-medium text-amber-900">Descreva o contrato e gere um rascunho com IA</p>
                    <p className="text-xs text-amber-700/80 mt-1">Rascunho gerado por IA — revise com advogado antes de usar.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiOpen(true)}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Gerar com IA
                  </button>
                </div>
              )}

              {sourceTab === 'pdf' && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-3">
                  <p className="text-sm text-blue-900">
                    O PDF enviado será usado como documento final. Variáveis como {'{{CLIENTE}}'} não se aplicam a PDFs
                    uploadados.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUploadPdf(f);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Enviando…' : currentContrato?.pdfFileName ? 'Substituir PDF' : 'Enviar PDF'}
                    </button>
                    {currentContrato?.pdfFileName && (
                      <span className="text-sm text-blue-800">{currentContrato.pdfFileName}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {sourceTab === 'text' && (
              <div className="h-[420px] border-b border-black/5">
                <ContractEditor
                  value={currentContrato?.texto || ''}
                  onChange={(val) => setCurrentContrato({ ...currentContrato, texto: val, sourceType: 'text' })}
                />
              </div>
            )}

            <div className="p-6 max-w-5xl mx-auto w-full">
              <h3 className="text-sm font-bold text-zinc-900 mb-1">Posição da assinatura do cliente</h3>
              <p className="text-xs text-zinc-500 mb-4">
                {sourceTab === 'text'
                  ? 'Posição vale para o PDF gerado automaticamente a partir do texto.'
                  : 'Posicione onde o cliente assinará no PDF enviado.'}
              </p>
              <SignaturePositioningPanel
                pdfUrl={previewUrl}
                pageCount={pageCount}
                orgName={userConfig.nome}
                field={signatureField}
                onFieldChange={(f) => {
                  setSignatureField(f);
                  setCurrentContrato((prev) => ({
                    ...prev,
                    signatureConfig: { clientField: f },
                  }));
                }}
                loading={previewLoading}
                error={previewError}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-full bg-[#F5F5F7] font-sans selection:bg-zinc-200">
          <div className="page-container">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 mb-4">
              <div>
                <h1 className="page-title">Contratos.</h1>
                <p className="text-zinc-400 mt-4 font-medium">Gerencie modelos de contrato, PDFs e posição da assinatura.</p>
              </div>
              <button
                onClick={() => {
                  setCurrentContrato({ titulo: '', texto: '', sourceType: 'text' });
                  setSourceTab('text');
                  setSignatureField(resolveSignatureField(null));
                  setIsEditing(true);
                }}
                className="btn-primary w-full sm:w-fit"
              >
                <Plus className="w-5 h-5" /> Novo Contrato
              </button>
            </div>

            <div className="apple-card overflow-hidden mx-0 !p-0">
              <div className="p-6 md:p-10 border-b border-zinc-100/50 bg-zinc-50/30">
                <div className="relative max-w-md w-full">
                  <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" />
                  <input
                    type="text"
                    placeholder="Buscar contratos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input pl-12 pr-6 py-4 w-full text-sm font-medium"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 p-6 sm:p-10">
                  <AnimatePresence mode="popLayout">
                    {filteredContratos.map((contrato, index) => (
                      <motion.div
                        key={contrato.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className="apple-card apple-card-hover group cursor-pointer !p-6 sm:!p-8 flex flex-col h-full"
                        onClick={() => {
                          setCurrentContrato(contrato);
                          setSourceTab(contrato.sourceType === 'pdf' ? 'pdf' : 'text');
                          setSignatureField(resolveSignatureField(contrato.signatureConfig));
                          setIsEditing(true);
                        }}
                      >
                        <div className="flex justify-between items-start mb-6 sm:mb-8">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-zinc-50 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all duration-500 border border-black/[0.02]">
                            <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <button
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
                            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest">Editar</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
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

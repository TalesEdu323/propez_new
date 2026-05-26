import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, ChevronLeft, LayoutTemplate } from 'lucide-react';
import Builder from '../../components/Builder';
import { SERVICE_WIDGETS } from '../../components/builder/serviceWidgets';
import type { BuilderElement } from '../../types/builder';
import type { Servico } from '../../lib/store';
import { buildDefaultServicoLayout } from '../../lib/servicoDefaultLayout';

export interface ServicoFormData {
  nome: string;
  descricao: string;
  valor: string;
  tipo: 'unico' | 'recorrente';
  contratoId: string;
}

interface ServicoEditorModalProps {
  open: boolean;
  editingId: string | null;
  initialForm: ServicoFormData;
  initialElementos: BuilderElement[];
  contratos: { id: string; titulo: string }[];
  onClose: () => void;
  onSave: (servico: Omit<Servico, 'id'> & { id?: string }, elementos: BuilderElement[]) => void;
}

export function ServicoEditorModal({
  open,
  editingId,
  initialForm,
  initialElementos,
  contratos,
  onClose,
  onSave,
}: ServicoEditorModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState(initialForm);
  const [layoutElements, setLayoutElements] = useState<BuilderElement[]>(initialElementos);

  useEffect(() => {
    if (open) {
      setStep(1);
      setFormData(initialForm);
      setLayoutElements(
        initialElementos.length > 0
          ? initialElementos
          : buildDefaultServicoLayout({
              nome: initialForm.nome,
              descricao: initialForm.descricao,
              valor: parseFloat(initialForm.valor) || 0,
              tipo: initialForm.tipo,
            }),
      );
    }
  }, [open, initialForm, initialElementos, editingId]);

  const goToLayout = (e: React.FormEvent) => {
    e.preventDefault();
    const draft = {
      nome: formData.nome,
      descricao: formData.descricao,
      valor: parseFloat(formData.valor) || 0,
      tipo: formData.tipo,
    };
    if (layoutElements.length === 0) {
      setLayoutElements(buildDefaultServicoLayout(draft));
    }
    setStep(2);
  };

  const handleSaveLayout = (elements: BuilderElement[]) => {
    onSave(
      {
        nome: formData.nome,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        tipo: formData.tipo,
        contratoId: formData.contratoId || undefined,
      },
      elements,
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className={`relative bg-white w-full shadow-2xl overflow-hidden flex flex-col ${
          step === 2 ? 'max-w-[96vw] h-[92vh] rounded-2xl' : 'max-w-lg rounded-[2.5rem]'
        }`}
      >
        {step === 1 ? (
          <>
            <div className="p-8 md:p-10 border-b border-zinc-100 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="section-title font-semibold">
                  {editingId ? 'Editar serviço' : 'Novo serviço'}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-zinc-900 rounded-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-zinc-500 text-sm mt-2">Passo 1 de 2 — dados e cobrança</p>
            </div>
            <form onSubmit={goToLayout} className="p-8 md:p-10 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                  Nome do serviço *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="glass-input px-5 py-3 w-full text-sm"
                  placeholder="Ex: Consultoria estratégica"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                  Descrição *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="glass-input px-5 py-3 w-full text-sm min-h-[100px] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    className="glass-input px-5 py-3 w-full text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                    Cobrança *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) =>
                      setFormData({ ...formData, tipo: e.target.value as 'unico' | 'recorrente' })
                    }
                    className="glass-input px-5 py-3 w-full text-sm"
                  >
                    <option value="unico">Pagamento único</option>
                    <option value="recorrente">Recorrente (mensal)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                  Contrato padrão (opcional)
                </label>
                <select
                  value={formData.contratoId}
                  onChange={(e) => setFormData({ ...formData, contratoId: e.target.value })}
                  className="glass-input px-5 py-3 w-full text-sm"
                >
                  <option value="">Nenhum</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full btn-primary py-4 flex items-center justify-center gap-2"
              >
                Montar layout do serviço
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary text-sm py-2"
              >
                <ChevronLeft className="w-4 h-4" /> Dados
              </button>
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <LayoutTemplate className="w-4 h-4" />
                <span className="font-semibold">{formData.nome}</span>
                <span className="text-zinc-400">— passo 2 de 2</span>
              </div>
              <button type="button" onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <Builder
                embedded
                initialElements={layoutElements}
                onChange={setLayoutElements}
                onSave={handleSaveLayout}
                saveLabel="Salvar serviço"
                widgetWhitelist={SERVICE_WIDGETS}
                hideImportExport
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

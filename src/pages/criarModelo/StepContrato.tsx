import { motion } from 'motion/react';
import { FileText, ExternalLink, ShieldCheck } from 'lucide-react';
import type { ContratoTemplate } from '../../lib/store';
import type { CriarModeloFormData, SetCriarModeloFormData } from './types';
import type { NavigateFn } from '../../types/navigation';
import { resolveSignatureField, hasConfiguredSignatureField } from '../../components/contratos/SignaturePositioningPanel';

export interface StepContratoProps {
  formData: CriarModeloFormData;
  setFormData: SetCriarModeloFormData;
  contratos: ContratoTemplate[];
  navigate: NavigateFn;
}

/**
 * Passo do CriarModelo: seleção de template de contrato padrão.
 * Posição da assinatura é definida no template (menu Contratos).
 */
export function StepContrato({ formData, setFormData, contratos, navigate }: StepContratoProps) {
  const selected = contratos.find((c) => c.id === formData.contratoId);
  const field = selected && hasConfiguredSignatureField(selected.signatureConfig)
    ? resolveSignatureField(selected.signatureConfig)
    : null;

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="section-title font-semibold mb-2">Contrato Padrão</h2>
          <p className="text-zinc-500">
            Selecione um template. A posição da assinatura do cliente é configurada em Contratos.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">
            Escolher Template *
          </label>
          <select
            value={formData.contratoId}
            onChange={(e) => {
              const templateId = e.target.value;
              const template = contratos.find((c) => c.id === templateId);
              if (template) {
                setFormData({
                  ...formData,
                  contratoId: templateId,
                  contratoTexto: template.sourceType === 'pdf' ? `[PDF] ${template.titulo}` : template.texto,
                  signatureConfig: template.signatureConfig,
                });
              } else {
                setFormData({
                  ...formData,
                  contratoId: '',
                  contratoTexto: '',
                  signatureConfig: undefined,
                });
              }
            }}
            className="w-full bg-zinc-50 border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
          >
            <option value="">Selecione um contrato...</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titulo} {c.sourceType === 'pdf' ? '(PDF)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selected && (
        <div className="mb-6 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-900">
                Assinatura configurada no contrato &quot;{selected.titulo}&quot;
              </p>
              {field ? (
                <p className="text-xs text-emerald-800 font-mono mt-1">
                  pág. {field.page} · x {field.xPct}% · y {field.yPct}%
                </p>
              ) : (
                <p className="text-xs text-amber-800 mt-1">
                  Este contrato ainda não tem posição de assinatura definida.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('contratos')}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-800 hover:text-emerald-950"
          >
            Editar contrato <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 bg-zinc-50 rounded-2xl border border-black/5 p-8 overflow-y-auto max-h-[600px]">
        {selected?.sourceType === 'pdf' ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-16 text-center">
            <FileText className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">Contrato em PDF: {selected.pdfFileName || selected.titulo}</p>
            <p className="text-xs mt-2 text-zinc-400 max-w-sm">
              O documento PDF será usado na assinatura. Edite posição e arquivo em Contratos.
            </p>
          </div>
        ) : formData.contratoTexto ? (
          <div className="prose prose-zinc max-w-none font-serif text-zinc-800 whitespace-pre-wrap">
            {formData.contratoTexto}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-20">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">Nenhum contrato selecionado.</p>
            <p className="text-xs mt-1">Selecione um template acima para visualizar o conteúdo.</p>
          </div>
        )}
      </div>
      <p className="text-[10px] text-zinc-400 mt-4 text-center uppercase tracking-widest">
        Posição da assinatura · configure em Contratos no menu lateral
      </p>
    </motion.div>
  );
}

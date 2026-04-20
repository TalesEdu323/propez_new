import { motion } from 'motion/react';
import { FileText } from 'lucide-react';
import type { ContratoTemplate } from '../../lib/store';
import type { CriarModeloFormData, SetCriarModeloFormData } from './types';

export interface StepContratoProps {
  formData: CriarModeloFormData;
  setFormData: SetCriarModeloFormData;
  contratos: ContratoTemplate[];
}

/**
 * Passo 2 do CriarModelo: seleção de template de contrato padrão e preview do texto.
 */
export function StepContrato({ formData, setFormData, contratos }: StepContratoProps) {
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
          <h2 className="text-3xl font-semibold text-zinc-900 mb-2 tracking-tight">Contrato Padrão</h2>
          <p className="text-zinc-500">Selecione um dos seus templates de contrato para este modelo.</p>
        </div>

        <div className="w-full sm:w-64">
          <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">Escolher Template *</label>
          <select
            value={formData.contratoId}
            onChange={(e) => {
              const templateId = e.target.value;
              const template = contratos.find(c => c.id === templateId);
              if (template) {
                setFormData({
                  ...formData,
                  contratoId: templateId,
                  contratoTexto: template.texto,
                });
              } else {
                setFormData({
                  ...formData,
                  contratoId: '',
                  contratoTexto: '',
                });
              }
            }}
            className="w-full bg-zinc-50 border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
          >
            <option value="">Selecione um contrato...</option>
            {contratos.map(c => (
              <option key={c.id} value={c.id}>{c.titulo}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 bg-zinc-50 rounded-2xl border border-black/5 p-8 overflow-y-auto max-h-[600px]">
        {formData.contratoTexto ? (
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
        Para editar o texto do contrato, acesse o menu "Contratos" no painel lateral.
      </p>
    </motion.div>
  );
}

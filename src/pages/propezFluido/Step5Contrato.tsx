import { motion, AnimatePresence } from 'motion/react';
import ContractEditor from '../../components/ContractEditor';
import type { ContratoTemplate } from '../../lib/store';
import type { PropezFluidoFormData, SetFormData } from './types';

export interface Step5Props {
  contratos: ContratoTemplate[];
  formData: PropezFluidoFormData;
  setFormData: SetFormData;
}

export function Step5Contrato({ contratos, formData, setFormData }: Step5Props) {
  return (
    <motion.div
      key="step5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-zinc-900 mb-2 tracking-tight">Prazos e Contrato</h2>
          <p className="text-zinc-500">Configure as datas, recorrência e termos legais.</p>
        </div>

        <div className="w-full sm:w-64">
          <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">Trocar Template de Contrato</label>
          <select
            value={formData.contratoId}
            onChange={(e) => {
              const templateId = e.target.value;
              const template = contratos.find(c => c.id === templateId);
              if (template) {
                setFormData(prev => ({
                  ...prev,
                  contratoId: templateId,
                  contratoTexto: template.texto,
                }));
              } else {
                setFormData(prev => ({ ...prev, contratoId: '' }));
              }
            }}
            className="w-full bg-zinc-50 border border-black/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
          >
            <option value="">Personalizado / Conforme Modelo</option>
            {contratos.map(c => (
              <option key={c.id} value={c.id}>{c.titulo}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Data de Envio</label>
            <input
              type="date"
              value={formData.envio}
              onChange={e => setFormData(prev => ({ ...prev, envio: e.target.value }))}
              className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Validade da Proposta</label>
            <input
              type="date"
              value={formData.validade}
              onChange={e => setFormData(prev => ({ ...prev, validade: e.target.value }))}
              className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
        </div>

        <div className="bg-zinc-50 p-6 rounded-3xl border border-black/5">
          <label className="flex items-center gap-4 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.recorrente}
              onChange={e => setFormData(prev => ({ ...prev, recorrente: e.target.checked }))}
              className="w-5 h-5 text-black rounded border-black/20 focus:ring-black accent-black"
            />
            <span className="text-sm font-semibold text-zinc-900">Este é um serviço recorrente (assinatura)</span>
          </label>

          <AnimatePresence>
            {formData.recorrente && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-hidden"
              >
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Ciclo de Cobrança</label>
                  <select
                    value={formData.cicloRecorrencia}
                    onChange={e => setFormData(prev => ({ ...prev, cicloRecorrencia: e.target.value }))}
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Duração (Meses)</label>
                  <input
                    type="number"
                    value={formData.duracaoRecorrencia}
                    onChange={e => setFormData(prev => ({ ...prev, duracaoRecorrencia: e.target.value }))}
                    placeholder="Ex: 12"
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 min-h-[600px] border border-black/5 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-zinc-50 px-4 py-2 border-b border-black/5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Confirmação dos Termos</span>
          <span className="text-[10px] text-zinc-400 italic">As variáveis serão substituídas automaticamente na visualização final</span>
        </div>
        <ContractEditor
          value={formData.contratoTexto}
          onChange={(val: string) => setFormData(prev => ({ ...prev, contratoTexto: val }))}
        />
      </div>
    </motion.div>
  );
}

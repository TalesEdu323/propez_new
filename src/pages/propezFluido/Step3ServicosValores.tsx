import { motion, AnimatePresence } from 'motion/react';
import { Check, ExternalLink } from 'lucide-react';
import type { Servico, ContratoTemplate } from '../../lib/store';
import { formatBRL } from '../../lib/format';
import { mergeServiceLayouts } from '../../lib/mergeServiceLayouts';
import type { PropezFluidoFormData, SetFormData } from './types';

export interface Step3Props {
  servicosDisponiveis: Servico[];
  contratos: ContratoTemplate[];
  formData: PropezFluidoFormData;
  setFormData: SetFormData;
  onOpenModelos?: () => void;
}

export function Step3ServicosValores({
  servicosDisponiveis,
  contratos,
  formData,
  setFormData,
  onOpenModelos,
}: Step3Props) {
  const toggleServico = (servicoId: string) => {
    const newServicos = formData.servicos.includes(servicoId)
      ? formData.servicos.filter(id => id !== servicoId)
      : [...formData.servicos, servicoId];

    const totalValor = newServicos.reduce((acc, id) => {
      const s = servicosDisponiveis.find(s => s.id === id);
      return acc + (s ? s.valor : 0);
    }, 0);

    let newContratoId = formData.contratoId;
    let newContratoTexto = formData.contratoTexto;

    if (!formData.contratoId && !formData.modeloId) {
      const servicoComContrato = servicosDisponiveis.find(s => newServicos.includes(s.id) && s.contratoId);
      if (servicoComContrato) {
        const template = contratos.find(c => c.id === servicoComContrato.contratoId);
        if (template) {
          newContratoId = template.id;
          newContratoTexto = template.texto;
        }
      }
    }

    setFormData(prev => {
      const baseElementos = prev.elementos?.length ? prev.elementos : [];
      const mergedElementos =
        prev.modeloId && baseElementos.length
          ? mergeServiceLayouts(baseElementos, newServicos, servicosDisponiveis)
          : prev.elementos;

      return {
        ...prev,
        servicos: newServicos,
        valor: totalValor.toString(),
        contratoId: newContratoId,
        contratoTexto: newContratoTexto,
        elementos: mergedElementos,
      };
    });
  };

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-12">
        <h2 className="section-title font-semibold mb-2">Serviços e Valores</h2>
        <p className="text-zinc-500 text-lg">Defina o escopo, prazos e o investimento necessário.</p>
        {onOpenModelos && (
          <p className="mt-4 text-sm text-zinc-600 max-w-2xl">
            Layout da página e texto do contrato vêm do{' '}
            <strong className="font-semibold text-zinc-900">modelo</strong> escolhido no passo 1. Para alterar
            visual ou contrato, edite o modelo em{' '}
            <button
              type="button"
              onClick={onOpenModelos}
              className="inline-flex items-center gap-1 font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
            >
              Modelos
              <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
            </button>
            .
          </p>
        )}
      </div>

      <div className="space-y-12">
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 mb-5 uppercase tracking-[0.2em]">Serviços Inclusos *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {servicosDisponiveis.length === 0 ? (
              <div className="col-span-full text-sm text-zinc-400 text-center p-12 bg-white rounded-[2rem] border border-black/[0.05] shadow-sm">Nenhum serviço cadastrado.</div>
            ) : (
              servicosDisponiveis.map(servico => {
                const checked = formData.servicos.includes(servico.id);
                return (
                  <label key={servico.id} className={`flex items-center gap-4 cursor-pointer p-5 rounded-2xl border transition-all duration-300 ${
                    checked
                      ? 'border-zinc-900 bg-white shadow-lg shadow-zinc-900/5'
                      : 'border-transparent bg-white hover:border-zinc-200 shadow-sm'
                  }`}>
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      checked ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-200'
                    }`}>
                      {checked && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleServico(servico.id)}
                      className="hidden"
                    />
                    <div className="flex-1">
                      <span className="block text-sm font-semibold text-zinc-900">{servico.nome}</span>
                      <span className="block text-xs text-zinc-500 mt-1">{formatBRL(servico.valor)}</span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-white p-8 rounded-[2.5rem] border border-black/[0.05] shadow-xl shadow-black/[0.02]">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-[0.2em]">Valor Total (R$) *</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">R$</span>
              <input
                type="number"
                value={formData.valor}
                onChange={e => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                className="w-full bg-zinc-50 border-transparent rounded-2xl pl-14 pr-5 py-5 text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all tracking-tight"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-[0.2em]">Desconto (R$)</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">R$</span>
              <input
                type="number"
                value={formData.desconto}
                onChange={e => setFormData(prev => ({ ...prev, desconto: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                className="w-full bg-zinc-50 border-transparent rounded-2xl pl-14 pr-5 py-5 text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all tracking-tight text-emerald-600"
              />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Data de Envio *</label>
              <input
                type="date"
                value={formData.envio}
                onChange={e => setFormData(prev => ({ ...prev, envio: e.target.value }))}
                className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Validade da Proposta *</label>
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
                    <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Duração (meses)</label>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-[0.2em]">Chave PIX (Opcional)</label>
            <input
              type="text"
              value={formData.chavePix}
              onChange={(e) => setFormData(prev => ({ ...prev, chavePix: e.target.value }))}
              className="w-full bg-white border border-black/[0.05] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all shadow-sm"
              placeholder="CNPJ, Email, Telefone..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 mb-3 uppercase tracking-[0.2em]">Link de Pagamento (Opcional)</label>
            <input
              type="url"
              value={formData.linkPagamento}
              onChange={(e) => setFormData(prev => ({ ...prev, linkPagamento: e.target.value }))}
              className="w-full bg-white border border-black/[0.05] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all shadow-sm"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

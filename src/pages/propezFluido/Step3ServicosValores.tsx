import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import type { Servico, ContratoTemplate } from '../../lib/store';
import { formatBRL } from '../../lib/format';
import type { PropezFluidoFormData, SetFormData } from './types';

export interface Step3Props {
  servicosDisponiveis: Servico[];
  contratos: ContratoTemplate[];
  formData: PropezFluidoFormData;
  setFormData: SetFormData;
}

export function Step3ServicosValores({ servicosDisponiveis, contratos, formData, setFormData }: Step3Props) {
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

    setFormData(prev => ({
      ...prev,
      servicos: newServicos,
      valor: totalValor.toString(),
      contratoId: newContratoId,
      contratoTexto: newContratoTexto,
    }));
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
        <h2 className="text-4xl font-semibold text-zinc-900 mb-3 tracking-tight">Serviços e Valores</h2>
        <p className="text-zinc-500 text-lg">Defina o escopo e o investimento necessário.</p>
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

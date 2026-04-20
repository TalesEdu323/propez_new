import { motion } from 'motion/react';
import { formatBRL } from '../../lib/format';
import type { Servico } from '../../lib/store';
import type { CriarModeloFormData, SetCriarModeloFormData } from './types';

export interface StepConfigProps {
  formData: CriarModeloFormData;
  setFormData: SetCriarModeloFormData;
  servicosDisponiveis: Servico[];
}

/**
 * Passo 1 do CriarModelo: nome, seleção de serviços e campos padrão de pagamento.
 */
export function StepConfig({ formData, setFormData, servicosDisponiveis }: StepConfigProps) {
  const toggleServico = (id: string) => {
    setFormData(prev => ({
      ...prev,
      servicos: prev.servicos.includes(id)
        ? prev.servicos.filter(s => s !== id)
        : [...prev.servicos, id],
    }));
  };

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-3xl font-semibold text-zinc-900 mb-2 tracking-tight">Configurações do Modelo</h2>
      <p className="text-zinc-500 mb-12">Defina as informações padrão que serão carregadas ao usar este modelo.</p>

      <div className="space-y-10">
        <div>
          <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Nome do Modelo *</label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-black/5"
            placeholder="Ex: Proposta Padrão - Desenvolvimento Web"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest">Serviços Inclusos no Modelo</label>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {servicosDisponiveis.length === 0 ? (
              <div className="text-sm text-zinc-500 text-center p-8 bg-zinc-50 rounded-2xl border border-black/5">Nenhum serviço cadastrado.</div>
            ) : (
              servicosDisponiveis.map(servico => (
                <label key={servico.id} className={`flex items-center gap-4 cursor-pointer p-4 rounded-2xl border transition-all ${
                  formData.servicos.includes(servico.id) ? 'border-black bg-black/5' : 'border-black/5 hover:border-black/20'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.servicos.includes(servico.id)}
                    onChange={() => toggleServico(servico.id)}
                    className="w-5 h-5 text-black rounded border-black/20 focus:ring-black accent-black"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-zinc-900">{servico.nome}</span>
                    <span className="block text-xs text-zinc-500 mt-1">{formatBRL(servico.valor)}</span>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-zinc-900 tracking-tight border-b border-black/5 pb-4">Pagamento Padrão</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Chave PIX Padrão</label>
              <input
                type="text"
                value={formData.chavePix}
                onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
                className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                placeholder="CNPJ, Email, Telefone..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Link de Pagamento Padrão</label>
              <input
                type="url"
                value={formData.linkPagamento}
                onChange={(e) => setFormData({ ...formData, linkPagamento: e.target.value })}
                className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

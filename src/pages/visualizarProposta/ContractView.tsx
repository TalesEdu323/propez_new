import { motion } from 'motion/react';
import { ChevronLeft, CheckCircle, DollarSign, FileCheck, FileText, X } from 'lucide-react';
import type { Proposta } from '../../lib/store';
import { buildRubricaDownloadUrl } from '../../services/rubricaApi';

export type RubricaStatus = 'pending' | 'sent' | 'signed' | 'cancelled' | 'failed' | null;

export interface ContractViewProps {
  proposta: Proposta;
  rubricaStatus: RubricaStatus;
  userConfig: { nome?: string; cnpj?: string };
  onBackToProposal: () => void;
}

export function ContractView({ proposta, rubricaStatus, userConfig, onBackToProposal }: ContractViewProps) {
  const hasContent = proposta.contratoTexto || proposta.chavePix || proposta.linkPagamento;

  return (
    <motion.div
      key="contract"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      className="max-w-4xl mx-auto pb-24"
    >
      <button
        onClick={onBackToProposal}
        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 mb-10 font-bold text-[10px] uppercase tracking-[0.2em] transition-all"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar para a Proposta
      </button>

      <h1 className="text-4xl font-bold text-zinc-900 mb-12 tracking-tight">Contrato e Pagamento</h1>

      {hasContent ? (
        <div className="space-y-12">
          {proposta.contratoTexto && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-full bg-white p-10 md:p-20 rounded-xl border border-black/[0.05] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] relative overflow-hidden min-h-[800px] flex flex-col">
                <div className="absolute top-0 left-0 w-full h-2 bg-zinc-900" />

                <div className="flex justify-between items-start mb-16">
                  <div>
                    <h3 className="text-3xl font-bold text-zinc-900 tracking-tight">Contrato de Prestação de Serviços</h3>
                    <p className="text-zinc-400 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">ID: {proposta.id.split('-')[0].toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-900 font-bold text-sm">{new Date().toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="prose prose-zinc max-w-none flex-1 font-serif text-base text-zinc-800 leading-relaxed whitespace-pre-wrap">
                  {proposta.contratoTexto}
                </div>

                <div className="mt-24 pt-12 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-16">
                  <div>
                    <div className="h-px bg-zinc-200 w-full mb-6" />
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">Contratada</p>
                    <p className="text-zinc-900 font-bold text-sm">{userConfig.nome || 'Sua Empresa'}</p>
                  </div>
                  <div>
                    <div className="h-px bg-zinc-200 w-full mb-6" />
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">Contratante</p>
                    <p className="text-zinc-900 font-bold text-sm">{proposta.cliente_nome}</p>
                  </div>
                </div>
              </div>

              {rubricaStatus && (
                <div className="mt-10 w-full max-w-2xl">
                  <div
                    className={`p-6 rounded-2xl border flex items-center gap-4 ${
                      rubricaStatus === 'signed'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : rubricaStatus === 'failed' || rubricaStatus === 'cancelled'
                          ? 'bg-red-50 border-red-100 text-red-700'
                          : 'bg-zinc-50 border-black/[0.03] text-zinc-700'
                    }`}
                  >
                    {rubricaStatus === 'signed' ? (
                      <CheckCircle className="w-5 h-5 shrink-0" />
                    ) : rubricaStatus === 'failed' || rubricaStatus === 'cancelled' ? (
                      <X className="w-5 h-5 shrink-0" />
                    ) : (
                      <FileCheck className="w-5 h-5 shrink-0 animate-pulse" />
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-bold text-[10px] uppercase tracking-[0.2em] mb-1">
                        Rubrica —{' '}
                        {rubricaStatus === 'signed'
                          ? 'Assinado'
                          : rubricaStatus === 'sent'
                            ? 'Aguardando assinatura'
                            : rubricaStatus === 'pending'
                              ? 'Preparando envio'
                              : rubricaStatus === 'cancelled'
                                ? 'Cancelado'
                                : 'Falha'}
                      </p>
                      {rubricaStatus === 'sent' && proposta.rubricaSigningUrl && (
                        <a
                          href={proposta.rubricaSigningUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium underline"
                        >
                          Abrir link de assinatura
                        </a>
                      )}
                      {rubricaStatus === 'signed' && (
                        <p className="text-sm font-medium">O cliente assinou o contrato.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-10 flex gap-3 flex-wrap justify-center">
                {rubricaStatus === 'signed' ? (
                  <a
                    href={buildRubricaDownloadUrl(proposta.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 px-8 inline-flex items-center bg-zinc-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-xl shadow-black/10"
                  >
                    <FileText className="w-4 h-4 inline-block mr-2" /> Baixar PDF Assinado
                  </a>
                ) : (
                  <button
                    onClick={() => alert('Aguarde a assinatura pelo Rubrica para baixar o PDF final.')}
                    className="h-12 px-8 bg-white border border-black/[0.05] text-zinc-900 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-50 transition-all shadow-sm"
                  >
                    <FileText className="w-4 h-4 inline-block mr-2" /> Baixar PDF
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {(proposta.chavePix || proposta.linkPagamento) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="apple-card p-10 md:p-16"
            >
              <h3 className="text-2xl font-bold text-zinc-900 mb-10 tracking-tight">Opções de Pagamento</h3>
              <div className="grid gap-8 md:grid-cols-2">
                {proposta.chavePix && (
                  <div className="bg-zinc-50/50 p-8 rounded-3xl border border-black/[0.03] flex flex-col items-center text-center group hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all duration-500">
                    <div className="w-16 h-16 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-black/10">
                      <DollarSign className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-zinc-900 mb-3 text-xl tracking-tight">Chave PIX</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-6 px-4 py-3 bg-white rounded-xl w-full border border-black/[0.03] break-all">{proposta.chavePix}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(proposta.chavePix || '');
                        alert('Chave PIX copiada!');
                      }}
                      className="w-full h-12 bg-zinc-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all active:scale-[0.98]"
                    >
                      Copiar Chave
                    </button>
                  </div>
                )}

                {proposta.linkPagamento && (
                  <div className="bg-zinc-50/50 p-8 rounded-3xl border border-black/[0.03] flex flex-col items-center text-center group hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all duration-500">
                    <div className="w-16 h-16 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-black/10">
                      <FileCheck className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-zinc-900 mb-3 text-xl tracking-tight">Link de Pagamento</h4>
                    <p className="text-zinc-500 text-sm font-medium mb-8">Pague de forma segura online via cartão ou boleto.</p>
                    <a
                      href={proposta.linkPagamento}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-12 flex items-center justify-center bg-zinc-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all active:scale-[0.98]"
                    >
                      Acessar Link
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="text-center py-24 apple-card">
          <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">Nenhuma informação de contrato ou pagamento configurada.</p>
        </div>
      )}
    </motion.div>
  );
}

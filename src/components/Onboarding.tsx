import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Rocket, Upload, CheckCircle2, User, Building2, FileText, Image as ImageIcon } from 'lucide-react';
import { store, UserConfig } from '../lib/store';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<UserConfig>({
    nome: '',
    cnpj: '',
    logo: '',
    assinatura: '',
    onboarded: false
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig({ ...config, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAssinaturaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig({ ...config, assinatura: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinish = () => {
    const finalConfig = { ...config, onboarded: true };
    store.saveUserConfig(finalConfig);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Bem-vindo ao Propez</h1>
          <p className="text-zinc-500 mt-2">Vamos configurar seu perfil profissional em poucos segundos.</p>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                s <= step ? 'bg-black' : 'bg-zinc-100'
              }`}
            />
          ))}
        </div>

        <div className="bg-white border border-zinc-100 rounded-[32px] p-8 md:p-12 shadow-2xl shadow-black/5">
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-zinc-900" />
                </div>
                <h2 className="text-xl font-semibold">Dados da Empresa</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Nome da Empresa / Profissional</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input 
                      type="text" 
                      value={config.nome}
                      onChange={e => setConfig({ ...config, nome: e.target.value })}
                      placeholder="Ex: Propez Soluções Digitais"
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">CNPJ (Opcional)</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input 
                      type="text" 
                      value={config.cnpj}
                      onChange={e => setConfig({ ...config, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                disabled={!config.nome}
                className="w-full bg-black text-white py-5 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Próximo Passo
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-zinc-900" />
                </div>
                <h2 className="text-xl font-semibold">Identidade Visual</h2>
              </div>

              <div className="space-y-8">
                <div className="flex flex-col items-center">
                  <label className="w-full cursor-pointer group">
                    <div className="w-full aspect-video bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center group-hover:border-black/20 transition-all overflow-hidden relative">
                      {config.logo ? (
                        <img src={config.logo} alt="Logo" className="w-full h-full object-contain p-4" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-zinc-400 mb-3 group-hover:text-black transition-colors" />
                          <span className="text-sm font-medium text-zinc-500 group-hover:text-black transition-colors">Upload da Logo</span>
                          <span className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest">PNG ou SVG preferencialmente</span>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  {config.logo && (
                    <button onClick={() => setConfig({ ...config, logo: '' })} className="mt-4 text-xs font-bold text-red-500 uppercase tracking-widest">Remover Logo</button>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 bg-zinc-100 text-zinc-900 py-5 rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all"
                >
                  Voltar
                </button>
                <button 
                  onClick={() => setStep(3)}
                  className="flex-[2] bg-black text-white py-5 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-zinc-900" />
                </div>
                <h2 className="text-xl font-semibold">Assinatura Digital</h2>
              </div>

              <p className="text-sm text-zinc-500 leading-relaxed">
                Faça o upload de uma imagem da sua assinatura (fundo branco ou transparente) para ser aplicada automaticamente nos contratos.
              </p>

              <div className="space-y-8">
                <div className="flex flex-col items-center">
                  <label className="w-full cursor-pointer group">
                    <div className="w-full h-32 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center group-hover:border-black/20 transition-all overflow-hidden relative">
                      {config.assinatura ? (
                        <img src={config.assinatura} alt="Assinatura" className="w-full h-full object-contain p-4" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-zinc-400 mb-2 group-hover:text-black transition-colors" />
                          <span className="text-xs font-medium text-zinc-500 group-hover:text-black transition-colors">Upload da Assinatura</span>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAssinaturaUpload} />
                  </label>
                  {config.assinatura && (
                    <button onClick={() => setConfig({ ...config, assinatura: '' })} className="mt-4 text-xs font-bold text-red-500 uppercase tracking-widest">Remover Assinatura</button>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(2)}
                  className="flex-1 bg-zinc-100 text-zinc-900 py-5 rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleFinish}
                  className="flex-[2] bg-black text-white py-5 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                >
                  Finalizar Configuração
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

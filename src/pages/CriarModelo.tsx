import { useState, useEffect } from 'react';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { store, ModeloProposta } from '../lib/store';
import Builder from '../components/Builder';
import { createId } from '../lib/ids';
import { useContratos, useServicos } from '../hooks/useStoreEntity';
import type { NavigateFn, RouteParams } from '../types/navigation';
import type { BuilderElement } from '../types/builder';
import type {
  CriarModeloFormData,
  CriarModeloStepDescriptor,
} from './criarModelo/types';
import { CriarModeloStepper } from './criarModelo/CriarModeloStepper';
import { StepConfig } from './criarModelo/StepConfig';
import { StepContrato } from './criarModelo/StepContrato';

const STEPS: CriarModeloStepDescriptor[] = [
  { id: 1, title: 'Configurações Base', desc: 'Nome, serviços e pagamentos' },
  { id: 2, title: 'Contrato Padrão', desc: 'Selecione o contrato' },
  { id: 3, title: 'Editor Visual', desc: 'Construa o layout da página' },
];

const INITIAL_FORM_DATA: CriarModeloFormData = {
  nome: '',
  servicos: [],
  contratoTexto: '',
  contratoId: '',
  chavePix: '',
  linkPagamento: '',
};

export default function CriarModelo({ navigate, initialData }: { navigate: NavigateFn; initialData?: RouteParams }) {
  const [step, setStep] = useState(1);
  const servicosDisponiveis = useServicos();
  const contratos = useContratos();

  const [formData, setFormData] = useState<CriarModeloFormData>(INITIAL_FORM_DATA);
  const [elementos, setElementos] = useState<BuilderElement[]>([]);

  useEffect(() => {
    if (initialData?.editId) {
      const modelo = store.getModelos().find(m => m.id === initialData.editId);
      if (modelo) {
        setFormData({
          nome: modelo.nome,
          servicos: modelo.servicos,
          contratoTexto: modelo.contratoTexto || '',
          contratoId: modelo.contratoId || '',
          chavePix: modelo.chavePix || '',
          linkPagamento: modelo.linkPagamento || '',
        });
        setElementos(modelo.elementos);
      }
    }
  }, [initialData]);

  const handleSave = (finalElements: BuilderElement[]) => {
    const newModelo: ModeloProposta = {
      id: initialData?.editId || createId(),
      nome: formData.nome,
      servicos: formData.servicos,
      contratoTexto: formData.contratoTexto,
      contratoId: formData.contratoId || undefined,
      chavePix: formData.chavePix,
      linkPagamento: formData.linkPagamento,
      elementos: finalElements,
      data_criacao: new Date().toISOString(),
    };

    const modelos = store.getModelos();
    if (initialData?.editId) {
      store.saveModelos(modelos.map(m => m.id === newModelo.id ? newModelo : m));
    } else {
      store.saveModelos([newModelo, ...modelos]);
    }

    navigate('modelos');
  };

  if (step === 3) {
    return (
      <motion.div
        className="h-screen w-full bg-transparent flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Builder
          initialElements={elementos}
          onSave={handleSave}
          onBack={() => setStep(2)}
          saveLabel="Salvar Modelo"
        />
      </motion.div>
    );
  }

  const handleAdvance = () => {
    if (step === 1) {
      if (!formData.nome) {
        alert('Por favor, dê um nome ao modelo.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f5f4] overflow-hidden font-sans">
      <CriarModeloStepper
        step={step}
        steps={STEPS}
        isEditing={!!initialData?.editId}
        formData={formData}
        onBack={() => navigate('modelos')}
      />

      <div className="flex-1 bg-white h-full overflow-y-auto relative flex flex-col">
        <div className="md:hidden p-6 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-20">
          <button onClick={() => navigate('modelos')} className="p-2 -ml-2 text-zinc-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Passo {step} de 3</span>
          <div className="w-9" />
        </div>

        <div className="flex-1 w-full max-w-3xl mx-auto py-12 px-6 md:py-20 md:px-16 flex flex-col">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <StepConfig
                  formData={formData}
                  setFormData={setFormData}
                  servicosDisponiveis={servicosDisponiveis}
                />
              )}

              {step === 2 && (
                <StepContrato
                  formData={formData}
                  setFormData={setFormData}
                  contratos={contratos}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="mt-12 pt-8 border-t border-black/5 flex items-center justify-between">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                step === 1 ? 'opacity-0 pointer-events-none' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              Anterior
            </button>

            <button
              onClick={handleAdvance}
              className="bg-[#0a0a0a] text-white hover:bg-zinc-800 rounded-xl px-8 py-4 text-sm font-medium transition-all active:scale-[0.98] flex items-center gap-2 shadow-lg shadow-black/10"
            >
              {step === 2 ? 'Ir para o Editor Visual' : 'Próximo Passo'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

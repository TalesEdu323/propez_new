import { useState, useEffect } from 'react';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { store, ModeloProposta } from '../lib/store';
import Builder from '../components/Builder';
import { createId } from '../lib/ids';
import { useContratos, useServicos } from '../hooks/useStoreEntity';
import type { NavigateFn, RouteParams } from '../types/navigation';
import type { BuilderElement } from '../types/builder';
import { flowHasStep } from '../types/proposalFlow';
import { applyStarterTemplate } from '../data/starterTemplates';
import { mergeServiceLayouts } from '../lib/mergeServiceLayouts';
import type { CriarModeloStepDescriptor } from './criarModelo/types';
import { INITIAL_CRIAR_MODELO_FORM } from './criarModelo/types';
import { CriarModeloStepper } from './criarModelo/CriarModeloStepper';
import { StepConfig } from './criarModelo/StepConfig';
import { StepFluxo } from './criarModelo/StepFluxo';
import { StepContrato } from './criarModelo/StepContrato';
import { EscolherPontoDePartida } from './criarModelo/EscolherPontoDePartida';

const STEPS: CriarModeloStepDescriptor[] = [
  { id: 1, title: 'Configurações Base', desc: 'Nome, serviços e pagamentos' },
  { id: 2, title: 'Fluxo da proposta', desc: 'Aprovar, assinar e pagar' },
  { id: 3, title: 'Contrato Padrão', desc: 'Selecione o contrato' },
  { id: 4, title: 'Editor Visual', desc: 'Construa o layout da página' },
];

export default function CriarModelo({ navigate, initialData }: { navigate: NavigateFn; initialData?: RouteParams }) {
  const [pickerDone, setPickerDone] = useState(!!initialData?.editId);
  const [step, setStep] = useState(1);
  const servicosDisponiveis = useServicos();
  const contratos = useContratos();

  const [formData, setFormData] = useState(INITIAL_CRIAR_MODELO_FORM);
  const [elementos, setElementos] = useState<BuilderElement[]>([]);
  const [importedServicoNames, setImportedServicoNames] = useState<string[]>([]);

  useEffect(() => {
    if (initialData?.editId) {
      const modelo = store.getModelos().find((m) => m.id === initialData.editId);
      if (modelo) {
        setFormData({
          nome: modelo.nome,
          servicos: modelo.servicos,
          contratoTexto: modelo.contratoTexto || '',
          contratoId: modelo.contratoId || '',
          chavePix: modelo.chavePix || '',
          linkPagamento: modelo.linkPagamento || '',
          fluxo: modelo.fluxo ?? INITIAL_CRIAR_MODELO_FORM.fluxo,
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
      fluxo: formData.fluxo,
      elementos: finalElements,
      data_criacao: new Date().toISOString(),
    };

    const modelos = store.getModelos();
    if (initialData?.editId) {
      store.saveModelos(modelos.map((m) => (m.id === newModelo.id ? newModelo : m)));
    } else {
      store.saveModelos([newModelo, ...modelos]);
    }

    navigate('modelos');
  };

  const handleStarter = (starterId: string) => {
    const applied = applyStarterTemplate(starterId);
    if (applied) {
      setFormData((prev) => ({
        ...prev,
        nome: prev.nome || `Modelo — ${applied.nome}`,
        fluxo: applied.fluxo,
      }));
      setElementos(applied.elementos);
    }
    setPickerDone(true);
  };

  if (!pickerDone && !initialData?.editId) {
    return (
      <EscolherPontoDePartida
        onBlank={() => setPickerDone(true)}
        onStarter={handleStarter}
      />
    );
  }

  const needsContractStep = flowHasStep(formData.fluxo, 'sign');

  if (step === 4) {
    return (
      <motion.div className="h-screen w-full bg-transparent flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {importedServicoNames.length > 0 && (
          <div className="shrink-0 px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-center text-sm text-emerald-800">
            Conteúdo importado dos serviços: <strong>{importedServicoNames.join(', ')}</strong> — você pode editar livremente.
          </div>
        )}
        <Builder
          initialElements={elementos}
          onSave={handleSave}
          onBack={() => setStep(needsContractStep ? 3 : 2)}
          saveLabel="Salvar Modelo"
        />
      </motion.div>
    );
  }

  const goToEditorWithServices = () => {
    const names = formData.servicos
      .map((id) => servicosDisponiveis.find((s) => s.id === id)?.nome)
      .filter((n): n is string => !!n);
    setElementos((prev) => mergeServiceLayouts(prev, formData.servicos, servicosDisponiveis));
    setImportedServicoNames(names);
    setStep(4);
  };

  const handleAdvance = () => {
    if (step === 1) {
      if (!formData.nome) {
        alert('Por favor, dê um nome ao modelo.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (needsContractStep) setStep(3);
      else goToEditorWithServices();
    } else if (step === 3) {
      goToEditorWithServices();
    }
  };

  const handleBackStep = () => {
    if (step === 4) setStep(needsContractStep ? 3 : 2);
    else if (step === 3) setStep(2);
    else setStep(step - 1);
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f5f4] overflow-hidden font-sans">
      <CriarModeloStepper
        step={step}
        steps={STEPS.filter((s) => s.id !== 3 || needsContractStep)}
        isEditing={!!initialData?.editId}
        formData={formData}
        onBack={() => navigate('modelos')}
      />

      <div className="flex-1 bg-white h-full overflow-y-auto relative flex flex-col">
        <div className="md:hidden p-6 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-20">
          <button onClick={() => navigate('modelos')} className="p-2 -ml-2 text-zinc-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Passo {step} de 4</span>
          <div className="w-9" />
        </div>

        <div className="flex-1 w-full max-w-3xl mx-auto py-12 px-6 md:py-20 md:px-16 flex flex-col">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <StepConfig formData={formData} setFormData={setFormData} servicosDisponiveis={servicosDisponiveis} />
              )}
              {step === 2 && <StepFluxo formData={formData} setFormData={setFormData} />}
              {step === 3 && needsContractStep && (
                <StepContrato formData={formData} setFormData={setFormData} contratos={contratos} />
              )}
            </AnimatePresence>
          </div>

          <div className="mt-12 pt-8 border-t border-black/5 flex items-center justify-between">
            <button
              onClick={handleBackStep}
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
              {step === 3 || (step === 2 && !needsContractStep) ? 'Ir para o Editor Visual' : 'Próximo Passo'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

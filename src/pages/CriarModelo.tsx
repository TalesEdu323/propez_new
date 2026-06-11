import { useState, useEffect } from 'react';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { store, ModeloProposta, fetchModeloById } from '../lib/store';
import { formatStoreSaveError } from '../lib/storeSaveFeedback';
import Builder from '../components/Builder';
import { createId } from '../lib/ids';
import { useContratos, useServicos, useUserConfig } from '../hooks/useStoreEntity';
import type { NavigateFn, RouteParams } from '../types/navigation';
import type { BuilderElement, BuilderPageLayout } from '../types/builder';
import type { OfferType } from '../lib/layoutContext';
import { normalizePageLayout } from '../lib/pageLayout';
import { flowHasStep } from '../types/proposalFlow';
import { applyStarterTemplate, applyOrgLogoToElements, getStarterOfferType } from '../data/starterTemplates';
import { mergeOrgBrandIntoPageLayout } from '../lib/pageLayout';
import { hydrateStarterImagePrompts } from '../lib/hydrateStarterImagePrompts';
import { mergeServiceLayouts } from '../lib/mergeServiceLayouts';
import { hasModelImageSlots } from '../lib/modelImageSlots';
import { hasUnresolvedImagePrompts } from '../lib/modelImagePrompts';
import { parseFluidoStep } from '../lib/parseFluidoStep';
import type { CriarModeloStepDescriptor } from './criarModelo/types';
import { INITIAL_CRIAR_MODELO_FORM } from './criarModelo/types';
import { CriarModeloStepper } from './criarModelo/CriarModeloStepper';
import { StepConfig } from './criarModelo/StepConfig';
import { StepFluxo } from './criarModelo/StepFluxo';
import { StepContrato } from './criarModelo/StepContrato';
import { StepImagens } from './criarModelo/StepImagens';
import { EscolherPontoDePartida } from './criarModelo/EscolherPontoDePartida';

const STEPS: CriarModeloStepDescriptor[] = [
  { id: 1, title: 'Configurações Base', desc: 'Nome, serviços e pagamentos' },
  { id: 2, title: 'Fluxo da proposta', desc: 'Aprovar, assinar e pagar' },
  { id: 3, title: 'Contrato Padrão', desc: 'Selecione o contrato' },
  { id: 4, title: 'Imagens e banners', desc: 'Visual gerado por IA' },
  { id: 5, title: 'Editor Visual', desc: 'Construa o layout da página' },
];

const IMAGENS_STEP = 4;
const BUILDER_STEP = 5;

export default function CriarModelo({ navigate, initialData }: { navigate: NavigateFn; initialData?: RouteParams }) {
  const [pickerDone, setPickerDone] = useState(!!initialData?.editId);
  const [step, setStep] = useState(1);
  const servicosDisponiveis = useServicos();
  const contratos = useContratos();
  const userConfig = useUserConfig();

  const [formData, setFormData] = useState(INITIAL_CRIAR_MODELO_FORM);
  const [elementos, setElementos] = useState<BuilderElement[]>([]);
  const [pageLayout, setPageLayout] = useState<BuilderPageLayout>(() => normalizePageLayout(null));
  const [importedServicoNames, setImportedServicoNames] = useState<string[]>([]);
  const [iaBrief, setIaBrief] = useState('');
  const [layoutOfferType, setLayoutOfferType] = useState<OfferType>(
    userConfig.segment ?? 'generico',
  );
  const [fromStarterId, setFromStarterId] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (userConfig.segment) setLayoutOfferType(userConfig.segment);
  }, [userConfig.segment]);

  useEffect(() => {
    if (!initialData?.editId) return;
    const editId = initialData.editId;
    const applyModelo = (modelo: ModeloProposta) => {
      setFormData({
        nome: modelo.nome,
        servicos: modelo.servicos,
        contratoTexto: modelo.contratoTexto || '',
        contratoId: modelo.contratoId || '',
        chavePix: modelo.chavePix || '',
        linkPagamento: modelo.linkPagamento || '',
        whatsappComprovante: modelo.whatsappComprovante || '',
        fluxo: modelo.fluxo ?? INITIAL_CRIAR_MODELO_FORM.fluxo,
        signatureConfig: modelo.signatureConfig,
      });
      setElementos(modelo.elementos);
      setPageLayout(normalizePageLayout(modelo.pageLayout));
    };
    void (async () => {
      const cached = store.getModelos().find((m) => m.id === editId);
      if (cached?.elementos?.length) {
        applyModelo(cached);
        return;
      }
      const full = await fetchModeloById(editId);
      if (full) applyModelo(full);
    })();
  }, [initialData?.editId]);

  const handleSave = async (finalElements: BuilderElement[], finalPageLayout: BuilderPageLayout) => {
    if (!formData.nome?.trim()) {
      alert('Informe o nome do modelo antes de salvar.');
      return;
    }
    if (flowHasStep(formData.fluxo, 'sign') && !formData.contratoId) {
      alert('Selecione um template de contrato no passo "Contrato Padrão" antes de salvar.');
      return;
    }
    if (hasUnresolvedImagePrompts(finalElements)) {
      alert('Resolva as imagens pendentes no passo "Imagens e banners" antes de salvar o modelo.');
      return;
    }
    if (formData.contratoId && !contratos.some((c) => c.id === formData.contratoId)) {
      alert('O contrato vinculado não existe mais. Selecione outro no passo "Contrato Padrão".');
      return;
    }
    const missingServicos = formData.servicos.filter(
      (id) => !servicosDisponiveis.some((s) => s.id === id),
    );
    if (missingServicos.length > 0) {
      alert('Um ou mais serviços vinculados não existem mais. Atualize a seleção de serviços.');
      return;
    }

    const newModelo: ModeloProposta = {
      id: initialData?.editId || createId(),
      nome: formData.nome.trim(),
      servicos: formData.servicos,
      contratoTexto: formData.contratoTexto,
      contratoId: formData.contratoId || undefined,
      chavePix: formData.chavePix,
      linkPagamento: formData.linkPagamento,
      whatsappComprovante: formData.whatsappComprovante,
      fluxo: formData.fluxo,
      signatureConfig: formData.signatureConfig,
      elementos: finalElements,
      pageLayout: finalPageLayout,
      data_criacao: new Date().toISOString(),
    };

    const modelos = store.getModelos();
    const nextList = initialData?.editId
      ? modelos.map((m) => (m.id === newModelo.id ? newModelo : m))
      : [newModelo, ...modelos];

    setSaveLoading(true);
    setSaveError(null);
    try {
      await store.saveModelosAsync(nextList);
      await fetchModeloById(newModelo.id);

      const fluidoReturn =
        typeof initialData?.fluidoReturn === 'string' ? initialData.fluidoReturn : undefined;
      const fluidoStep = parseFluidoStep(initialData?.fluidoStep);
      if (fluidoReturn && fluidoReturn === newModelo.id && fluidoStep != null) {
        navigate('propez-fluido', { fluidoReturn, fluidoStep });
      } else {
        navigate('modelos');
      }
    } catch (err) {
      setSaveError(formatStoreSaveError(err));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleStarter = (starterId: string) => {
    const applied = applyStarterTemplate(starterId);
    if (applied) {
      const orgLogo = userConfig.logo;
      const pageLayoutMerged = mergeOrgBrandIntoPageLayout(applied.pageLayout, {
        isWhiteLabel: userConfig.whitelabelEnabled === true,
        logoUrl: orgLogo ?? null,
        primaryColor: userConfig.primaryColor ?? null,
        secondaryColor: userConfig.secondaryColor ?? null,
      });
      setFormData((prev) => ({
        ...prev,
        nome: prev.nome || `Modelo — ${applied.nome}`,
        fluxo: applied.fluxo,
      }));
      setElementos(applyOrgLogoToElements(applied.elementos, orgLogo));
      setPageLayout(pageLayoutMerged);
      setLayoutOfferType(applied.offerType ?? getStarterOfferType(starterId));
      setFromStarterId(starterId);
    }
    setPickerDone(true);
  };

  const handleAiGenerated = (
    els: BuilderElement[],
    layout?: BuilderPageLayout,
    offerType?: OfferType,
    brief?: string,
  ) => {
    setElementos(els);
    if (layout) setPageLayout(normalizePageLayout(layout));
    if (offerType) setLayoutOfferType(offerType);
    if (brief) setIaBrief(brief);
    setPickerDone(true);
  };

  if (!pickerDone && !initialData?.editId) {
    return (
      <EscolherPontoDePartida
        onBlank={() => setPickerDone(true)}
        onStarter={handleStarter}
        onAiGenerated={handleAiGenerated}
      />
    );
  }

  const needsContractStep = flowHasStep(formData.fluxo, 'sign');
  const visibleSteps = STEPS.filter((s) => s.id !== 3 || needsContractStep);
  const totalSteps = visibleSteps.length;

  const builderBackStep = hasModelImageSlots(elementos) ? IMAGENS_STEP : needsContractStep ? 3 : 2;

  if (step === BUILDER_STEP) {
    return (
      <motion.div className="h-screen w-full bg-transparent flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {importedServicoNames.length > 0 && (
          <div className="shrink-0 px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-center text-sm text-emerald-800">
            Conteúdo importado dos serviços: <strong>{importedServicoNames.join(', ')}</strong> — você pode editar livremente.
          </div>
        )}
        <Builder
          initialElements={elementos}
          initialPageLayout={pageLayout}
          onPageLayoutChange={setPageLayout}
          onSave={handleSave}
          onBack={() => setStep(builderBackStep)}
          saveLabel="Salvar Modelo"
          saveLoading={saveLoading}
          saveError={saveError}
        />
      </motion.div>
    );
  }

  const goToImagensOrBuilder = () => {
    const names = formData.servicos
      .map((id) => servicosDisponiveis.find((s) => s.id === id)?.nome)
      .filter((n): n is string => !!n);
    let merged = mergeServiceLayouts(elementos, formData.servicos, servicosDisponiveis);
    if (fromStarterId) {
      merged = hydrateStarterImagePrompts(merged, {
        modelName: formData.nome,
        serviceNames: names,
        brief: iaBrief || undefined,
      });
    }
    setElementos(merged);
    setImportedServicoNames(names);
    if (hasModelImageSlots(merged)) {
      setStep(IMAGENS_STEP);
    } else {
      setStep(BUILDER_STEP);
    }
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
      else goToImagensOrBuilder();
    } else if (step === 3) {
      if (!formData.contratoId) {
        alert('Por favor, selecione um template de contrato.');
        return;
      }
      goToImagensOrBuilder();
    } else if (step === IMAGENS_STEP) {
      if (hasUnresolvedImagePrompts(elementos)) {
        alert('Gere ou resolva as imagens pendentes antes de continuar para o editor visual.');
        return;
      }
      setStep(BUILDER_STEP);
    }
  };

  const handleBackStep = () => {
    if (step === IMAGENS_STEP) {
      setStep(needsContractStep ? 3 : 2);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const advanceLabel =
    step === IMAGENS_STEP
      ? 'Ir para o Editor Visual'
      : step === 3 || (step === 2 && !needsContractStep)
        ? hasModelImageSlots(elementos)
          ? 'Revisar imagens'
          : 'Ir para o Editor Visual'
        : 'Próximo Passo';

  return (
    <div className="flex h-screen w-full bg-[#f5f5f4] overflow-hidden font-sans">
      <CriarModeloStepper
        step={step}
        steps={visibleSteps}
        isEditing={!!initialData?.editId}
        formData={formData}
        onBack={() => navigate('modelos')}
      />

      <div className="flex-1 bg-white h-full overflow-y-auto relative flex flex-col">
        <div className="md:hidden p-6 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-20">
          <button onClick={() => navigate('modelos')} className="p-2 -ml-2 text-zinc-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Passo {visibleSteps.findIndex((s) => s.id === step) + 1} de {totalSteps}
          </span>
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
                <StepContrato formData={formData} setFormData={setFormData} contratos={contratos} navigate={navigate} />
              )}
              {step === IMAGENS_STEP && (
                <StepImagens
                  elementos={elementos}
                  offerType={layoutOfferType}
                  brief={iaBrief || undefined}
                  modelName={formData.nome}
                  serviceNames={formData.servicos
                    .map((id) => servicosDisponiveis.find((s) => s.id === id)?.nome)
                    .filter((n): n is string => Boolean(n))}
                  onElementosChange={setElementos}
                  autoResolve={Boolean(fromStarterId) || hasUnresolvedImagePrompts(elementos)}
                />
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
              {advanceLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

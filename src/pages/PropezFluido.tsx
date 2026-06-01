import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import {
  store,
  resolvePlan,
  Proposta,
  generatePublicLink,
  createCliente,
  createProposta,
  updateProposta,
} from '../lib/store';
import { updateProposalStatusInCRM, type ExternalClient } from '../services/crmApi';
import { createId } from '../lib/ids';
import { replaceContractString, replaceVariablesInElements, type ContractContext } from '../lib/contractVariables';
import type { BuilderElement, BuilderPageLayout } from '../types/builder';
import { useClientes, useContratos, useModelos, useServicos, useUserConfig } from '../hooks/useStoreEntity';
import { canCreateProposal, type PlanTier } from '../lib/featureFlags';
import { UpgradeGate } from '../components/UpgradeGate';
import { SuccessStep } from './propezFluido/SuccessStep';
import { ProSyncLeadPickerModal } from './propezFluido/ProSyncLeadPickerModal';
import { WizardStepper } from './propezFluido/WizardStepper';
import { Step1ModeloSelect } from './propezFluido/Step1ModeloSelect';
import { Step2ClienteForm } from './propezFluido/Step2ClienteForm';
import { Step3ServicosValores } from './propezFluido/Step3ServicosValores';
import { Step4VisualBuilder } from './propezFluido/Step4VisualBuilder';
import type { PropezFluidoFormData, StepDescriptor } from './propezFluido/types';
import { INITIAL_PROPEZ_FLUIDO_FORM } from './propezFluido/types';
import type { NavigateFn, RouteParams } from '../types/navigation';
import { mergeServiceLayouts } from '../lib/mergeServiceLayouts';

const TOTAL_WIZARD_STEPS = 4;
/** Passo após o último do wizard (tela de sucesso). */
const SUCCESS_STEP = TOTAL_WIZARD_STEPS + 1;

const STEPS: StepDescriptor[] = [
  { id: 1, title: 'Modelo Base', desc: 'Escolha um ponto de partida' },
  { id: 2, title: 'Cliente', desc: 'Para quem é esta proposta?' },
  { id: 3, title: 'Serviços e prazos', desc: 'Valores, datas e cobrança' },
  { id: 4, title: 'Visual', desc: 'Personalize o layout da proposta' },
];

const INITIAL_FORM_DATA: PropezFluidoFormData = {
  ...INITIAL_PROPEZ_FLUIDO_FORM,
  envio: new Date().toISOString().split('T')[0],
  validade: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asUuidOrUndefined(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  return UUID_REGEX.test(value) ? value : undefined;
}

export default function PropezFluido({ navigate, initialData }: { navigate: NavigateFn; initialData?: RouteParams }) {
  const [step, setStep] = useState(1);
  const [createdPropostaId, setCreatedPropostaId] = useState<string>('');
  const clientes = useClientes();
  const modelos = useModelos();
  const servicosDisponiveis = useServicos();
  const contratos = useContratos();
  const userConfig = useUserConfig();
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [formData, setFormData] = useState<PropezFluidoFormData>(INITIAL_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [quotaGate, setQuotaGate] = useState<{ open: boolean; requiredPlan: PlanTier; reason?: string }>({
    open: false,
    requiredPlan: 'pro',
  });

  useEffect(() => {
    if (initialData?.editId) {
      const prop = store.getPropostas().find(p => p.id === initialData.editId);
      if (prop) {
        setFormData(prev => ({
          ...prev,
          modeloId: prop.modelo_id || '',
          clienteId: prop.cliente_id,
          clienteNome: prop.cliente_nome,
          prosyncLeadId: prop.prosyncLeadId || '',
          servicos: prop.servicos || [],
          valor: prop.valor.toString(),
          desconto: prop.desconto?.toString() || '',
          recorrente: prop.recorrente || false,
          cicloRecorrencia: prop.ciclo_recorrencia || 'mensal',
          duracaoRecorrencia: prop.duracao_recorrencia?.toString() || '12',
          envio: prop.data_envio || prev.envio,
          validade: prop.data_validade || prev.validade,
          elementos: prop.elementos || [],
          pageLayout: prop.pageLayout,
          contratoTexto: prop.contratoTexto || '',
          contratoId: prop.contratoId || '',
          chavePix: prop.chavePix || '',
          linkPagamento: prop.linkPagamento || '',
        }));
        setStep(2);
      }
    }
  }, [initialData]);

  const handleModeloSelect = (modeloId: string) => {
    const modelo = modelos.find(m => m.id === modeloId);
    if (modelo) {
      const totalValor = modelo.servicos.reduce((acc, servicoId) => {
        const servico = servicosDisponiveis.find(s => s.id === servicoId);
        return acc + (servico ? servico.valor : 0);
      }, 0);
      setFormData(prev => ({
        ...prev,
        modeloId,
        servicos: modelo.servicos,
        valor: totalValor.toString(),
        elementos: mergeServiceLayouts(modelo.elementos, modelo.servicos, servicosDisponiveis),
        pageLayout: modelo.pageLayout,
        contratoTexto: modelo.contratoTexto || '',
        contratoId: modelo.contratoId || '',
        chavePix: modelo.chavePix || '',
        linkPagamento: modelo.linkPagamento || '',
        fluxo: modelo.fluxo ?? prev.fluxo,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        modeloId: '',
        servicos: [],
        valor: '',
        elementos: [],
        contratoTexto: '',
        contratoId: '',
        chavePix: '',
        linkPagamento: '',
      }));
    }
  };

  const handleSelectProSyncLead = (lead: ExternalClient) => {
    setFormData(prev => ({
      ...prev,
      clienteId: `prosync-${lead.id}`,
      clienteNome: lead.name,
      clienteEmail: lead.email,
      prosyncLeadId: lead.id,
    }));
    setShowLeadPicker(false);
  };

  const buildContractContext = (): ContractContext => ({
    clienteNome: formData.clienteNome,
    clienteEmail: formData.clienteEmail,
    valor: formData.valor,
    desconto: formData.desconto,
    dataEnvio: formData.envio,
    dataValidade: formData.validade,
    servicosNomes: formData.servicos
      .map(id => servicosDisponiveis.find(s => s.id === id)?.nome)
      .filter((n): n is string => !!n),
    empresaNome: userConfig.nome,
    empresaCnpj: userConfig.cnpj,
    assinaturaImagem: userConfig.assinatura,
  });

  const replaceString = (str: string) => replaceContractString(str, buildContractContext());
  const replaceVariables = (elements: BuilderElement[]) =>
    replaceVariablesInElements(elements, buildContractContext());

  const handleSave = async (finalElements: BuilderElement[], finalPageLayout?: BuilderPageLayout) => {
    const isEditing = !!initialData?.editId;

    // Só checamos a cota quando é proposta NOVA — edições não consomem quota.
    if (!isEditing) {
      const freshConfig = store.ensureUsage();
      const gate = canCreateProposal(freshConfig);
      if (!gate.allowed) {
        setQuotaGate({
          open: true,
          requiredPlan: gate.requiredPlan ?? 'pro',
          reason: gate.reason,
        });
        return;
      }
    }

    const newPropostaId = initialData?.editId || createId();
    const finalContractText = replaceString(formData.contratoTexto);

    let resolvedClienteId = asUuidOrUndefined(formData.clienteId);
    const modeloId = asUuidOrUndefined(formData.modeloId);

    const newProposta: Proposta = {
      id: newPropostaId,
      cliente_id: resolvedClienteId ?? '',
      cliente_nome: formData.clienteNome,
      clienteEmail: formData.clienteEmail?.trim() || undefined,
      modelo_id: modeloId,
      servicos: formData.servicos,
      valor: Number(formData.valor),
      desconto: Number(formData.desconto) || 0,
      recorrente: formData.recorrente,
      ciclo_recorrencia: formData.cicloRecorrencia,
      duracao_recorrencia: Number(formData.duracaoRecorrencia) || 0,
      data_envio: formData.envio,
      data_validade: formData.validade,
      status: 'pendente',
      data_criacao: new Date().toISOString(),
      elementos: finalElements,
      pageLayout: finalPageLayout ?? formData.pageLayout,
      contratoTexto: finalContractText,
      contratoId: formData.contratoId || undefined,
      chavePix: formData.chavePix,
      linkPagamento: formData.linkPagamento,
      pago: false,
      prosyncLeadId: formData.prosyncLeadId || undefined,
      creatorPlan: resolvePlan(userConfig),
      fluxo: formData.fluxo,
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      if (
        !isEditing &&
        !resolvedClienteId &&
        formData.clienteNome &&
        !formData.prosyncLeadId
      ) {
        const createdCliente = await createCliente({
          nome: formData.clienteNome,
          empresa: '',
          email: formData.clienteEmail || '',
          telefone: '',
        });
        resolvedClienteId = createdCliente.id;
        newProposta.cliente_id = createdCliente.id;
        if (!newProposta.clienteEmail && createdCliente.email) {
          newProposta.clienteEmail = createdCliente.email;
        }
      }

      const persisted = isEditing
        ? await updateProposta(newProposta.id, newProposta)
        : await createProposta(newProposta);

      if (formData.prosyncLeadId) {
        void (async () => {
          let proposalUrl = `${window.location.origin}/app?route=visualizar-proposta&id=${persisted.id}`;
          try {
            const publicLink = await generatePublicLink(persisted.id);
            if (publicLink?.url) proposalUrl = publicLink.url;
          } catch (error) {
            console.warn('[PropezFluido] falha ao gerar link publico para CRM:', error);
          }

          await updateProposalStatusInCRM({
            proposalId: persisted.id,
            crmClientId: formData.prosyncLeadId!,
            status: 'pendente',
            value: Number(formData.valor),
            updatedAt: new Date().toISOString(),
            proposalUrl,
          });
        })();
      }

      setCreatedPropostaId(persisted.id);
      setStep(SUCCESS_STEP);
    } catch (error) {
      console.error('[PropezFluido] erro ao salvar proposta:', error);
      setSaveError('Nao foi possivel salvar a proposta. Revise os campos e tente novamente.');
      alert('Erro ao salvar proposta. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (step === SUCCESS_STEP && !createdPropostaId) {
    setStep(TOTAL_WIZARD_STEPS);
    return null;
  }

  if (step === SUCCESS_STEP) {
    return (
      <SuccessStep
        propostaId={createdPropostaId}
        clienteEmail={formData.clienteEmail}
        onEmailChange={email => setFormData(prev => ({ ...prev, clienteEmail: email }))}
        onNavigateToPropostas={() => navigate('propostas')}
        onNavigateToView={() => navigate('visualizar-proposta', { id: createdPropostaId })}
      />
    );
  }

  const handleAdvance = async () => {
    if (step === 1 && !formData.modeloId) {
      alert('Selecione um modelo e confirme no preview antes de continuar.');
      return;
    }
    if (step === 2 && !formData.clienteNome) {
      alert('Preencha o nome do cliente.');
      return;
    }
    if (step === 3) {
      if (!formData.servicos.length || !formData.valor) {
        alert('Selecione pelo menos um serviço e preencha o valor.');
        return;
      }
      if (!formData.envio || !formData.validade) {
        alert('Preencha as datas de envio e validade.');
        return;
      }
      if (!formData.elementos.length) {
        alert('Esta proposta está sem layout. Volte ao passo 1 e selecione um modelo para gerar a proposta.');
        return;
      }
      setStep(4);
      return;
    }
    if (step === 4) {
      await handleSave(replaceVariables(formData.elementos), formData.pageLayout);
      return;
    }
    setStep(step + 1);
  };

  return (
    <div className="flex h-dvh min-h-0 w-full max-w-full bg-[#F5F5F7] overflow-hidden font-sans">
      <WizardStepper
        step={step}
        steps={STEPS}
        isEditing={!!initialData?.editId}
        formData={formData}
        onBack={() => navigate('propostas')}
      />

      <div className="flex-1 min-h-0 min-w-0 bg-[#F5F5F7] flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden shrink-0 p-4 border-b border-black/[0.05] flex flex-col gap-4 bg-white/80 backdrop-blur-2xl z-20">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('propostas')} className="p-2 -ml-2 text-zinc-500">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Passo {step} de {TOTAL_WIZARD_STEPS}
            </span>
            <div className="w-9" />
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(step / TOTAL_WIZARD_STEPS) * 100}%` }}
              className="h-full bg-zinc-900"
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto py-6 px-4 sm:px-6 md:py-10 md:px-12 lg:px-20 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <Step1ModeloSelect
                  modelos={modelos}
                  formData={formData}
                  onSelectModelo={handleModeloSelect}
                  onNext={() => setStep(2)}
                  onOpenModelos={() => navigate('modelos')}
                  onOpenLoja={() => navigate('modelos', { tab: 'loja' })}
                />
              )}
              {step === 2 && (
                <Step2ClienteForm
                  clientes={clientes}
                  formData={formData}
                  setFormData={setFormData}
                  onOpenLeadPicker={() => setShowLeadPicker(true)}
                />
              )}
              {step === 3 && (
                <Step3ServicosValores
                  servicosDisponiveis={servicosDisponiveis}
                  contratos={contratos}
                  formData={formData}
                  setFormData={setFormData}
                  onOpenModelos={() => navigate('modelos')}
                />
              )}
              {step === 4 && (
                <Step4VisualBuilder formData={formData} setFormData={setFormData} />
              )}
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 md:mt-8 pt-6 shrink-0 border-t border-black/5 flex items-center justify-between gap-3">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1 || isSaving}
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                step === 1 ? 'opacity-0 pointer-events-none' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              Anterior
            </button>

            <button
              onClick={handleAdvance}
              disabled={isSaving}
              className="bg-[#0a0a0a] text-white hover:bg-zinc-800 rounded-xl px-8 py-4 text-sm font-medium transition-all active:scale-[0.98] flex items-center gap-2 shadow-lg shadow-black/10"
            >
              {isSaving ? 'Salvando...' : step === TOTAL_WIZARD_STEPS ? 'Gerar Proposta' : 'Próximo Passo'}
              {step !== TOTAL_WIZARD_STEPS && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
          {saveError && (
            <p className="mt-3 text-sm text-red-600 font-medium">{saveError}</p>
          )}
        </div>
      </div>

      <ProSyncLeadPickerModal
        open={showLeadPicker}
        onClose={() => setShowLeadPicker(false)}
        onSelect={handleSelectProSyncLead}
      />

      <UpgradeGate
        open={quotaGate.open}
        onClose={() => setQuotaGate(prev => ({ ...prev, open: false }))}
        feature="Criar mais propostas"
        reason={quotaGate.reason}
        requiredPlan={quotaGate.requiredPlan}
      />
    </div>
  );
}

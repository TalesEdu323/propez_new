import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { store, resolvePlan, Cliente, Proposta } from '../lib/store';
import { updateProposalStatusInCRM, type ExternalClient } from '../services/crmApi';
import { createId } from '../lib/ids';
import { replaceContractString, replaceVariablesInElements, type ContractContext } from '../lib/contractVariables';
import type { BuilderElement } from '../types/builder';
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
import { Step5Contrato } from './propezFluido/Step5Contrato';
import type { PropezFluidoFormData, StepDescriptor } from './propezFluido/types';
import type { NavigateFn, RouteParams } from '../types/navigation';

const STEPS: StepDescriptor[] = [
  { id: 1, title: 'Modelo Base', desc: 'Escolha um ponto de partida' },
  { id: 2, title: 'Cliente', desc: 'Para quem é esta proposta?' },
  { id: 3, title: 'Serviços & Valores', desc: 'O que está sendo oferecido' },
  { id: 4, title: 'Visual Builder', desc: 'Personalize sua proposta' },
  { id: 5, title: 'Contrato', desc: 'Termos e condições legais' },
];

const INITIAL_FORM_DATA: PropezFluidoFormData = {
  modeloId: '',
  clienteId: '',
  clienteNome: '',
  clienteEmail: '',
  prosyncLeadId: '',
  servicos: [],
  valor: '',
  desconto: '',
  recorrente: false,
  cicloRecorrencia: 'mensal',
  duracaoRecorrencia: '12',
  envio: new Date().toISOString().split('T')[0],
  validade: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  elementos: [],
  contratoTexto: '',
  contratoId: '',
  chavePix: '',
  linkPagamento: '',
};

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
        elementos: modelo.elementos,
        contratoTexto: modelo.contratoTexto || '',
        contratoId: modelo.contratoId || '',
        chavePix: modelo.chavePix || '',
        linkPagamento: modelo.linkPagamento || '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        modeloId: '',
        servicos: [],
        valor: '',
        elementos: [],
        contratoTexto: '',
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

  const handleSave = (finalElements: BuilderElement[]) => {
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

    const newProposta: Proposta = {
      id: newPropostaId,
      cliente_id: formData.clienteId || 'novo',
      cliente_nome: formData.clienteNome,
      modelo_id: formData.modeloId,
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
      contratoTexto: finalContractText,
      contratoId: formData.contratoId || undefined,
      chavePix: formData.chavePix,
      linkPagamento: formData.linkPagamento,
      pago: false,
      prosyncLeadId: formData.prosyncLeadId || undefined,
      creatorPlan: resolvePlan(userConfig),
    };

    const propostas = store.getPropostas();
    const updated = isEditing
      ? propostas.map(p => p.id === newProposta.id ? newProposta : p)
      : [...propostas, newProposta];

    store.savePropostas(updated);
    if (!isEditing) {
      store.incrementUsage('propostasThisMonth');
    }

    if (formData.prosyncLeadId) {
      updateProposalStatusInCRM({
        proposalId: newPropostaId,
        crmClientId: formData.prosyncLeadId,
        status: 'pendente',
        value: Number(formData.valor),
        updatedAt: new Date().toISOString(),
        proposalUrl: `${window.location.origin}/?route=visualizar-proposta&id=${newPropostaId}`,
      });
    }

    if (!formData.clienteId && formData.clienteNome) {
      const newCliente: Cliente = {
        id: newProposta.cliente_id,
        nome: formData.clienteNome,
        empresa: '',
        email: formData.clienteEmail || '',
        telefone: '',
        data_cadastro: new Date().toISOString(),
      };
      store.saveClientes([...clientes, newCliente]);
    }

    setCreatedPropostaId(newPropostaId);
    setStep(6);
  };

  if (step === 6 && !createdPropostaId) {
    setStep(5);
    return null;
  }

  if (step === 6) {
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

  const handleAdvance = () => {
    if (step === 2 && !formData.clienteNome) {
      alert('Preencha o nome do cliente.');
      return;
    }
    if (step === 3 && (!formData.servicos.length || !formData.valor)) {
      alert('Selecione pelo menos um serviço e preencha o valor.');
      return;
    }
    if (step === 5 && (!formData.envio || !formData.validade)) {
      alert('Preencha as datas de envio e validade.');
      return;
    }
    if (step === 5) {
      handleSave(replaceVariables(formData.elementos));
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F5F5F7] overflow-hidden font-sans">
      <WizardStepper
        step={step}
        steps={STEPS}
        isEditing={!!initialData?.editId}
        formData={formData}
        onBack={() => navigate('propostas')}
      />

      <div className="flex-1 bg-[#F5F5F7] h-full overflow-y-auto relative flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-black/[0.05] flex flex-col gap-4 sticky top-0 bg-white/80 backdrop-blur-2xl z-20">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('propostas')} className="p-2 -ml-2 text-zinc-500">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Passo {step} de 5</span>
            <div className="w-9" />
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(step / 5) * 100}%` }}
              className="h-full bg-zinc-900"
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="flex-1 w-full max-w-4xl mx-auto py-12 px-6 md:py-24 md:px-20 flex flex-col">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <Step1ModeloSelect
                  modelos={modelos}
                  formData={formData}
                  onSelectModelo={handleModeloSelect}
                  onNext={() => setStep(2)}
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
                />
              )}
              {step === 4 && (
                <Step4VisualBuilder formData={formData} setFormData={setFormData} />
              )}
              {step === 5 && (
                <Step5Contrato
                  contratos={contratos}
                  formData={formData}
                  setFormData={setFormData}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
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
              {step === 5 ? 'Gerar Proposta' : 'Próximo Passo'}
              {step !== 5 && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
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

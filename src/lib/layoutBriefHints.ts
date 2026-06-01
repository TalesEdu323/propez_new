import { inferLayoutContext, type OfferType } from './layoutContext';
import { resolvePlan, type UserConfig } from './planConfig';

/** Perguntas sugeridas no modal de brief (cliente). */
export function getBriefQuestionChipsForPrompt(prompt: string, config: UserConfig): string[] {
  const plan = resolvePlan(config);
  const hasMarketing = plan === 'business';
  const ctx = inferLayoutContext(prompt, hasMarketing);
  return getBriefQuestionChipsByOffer(ctx.offerType, hasMarketing);
}

export function getBriefQuestionChipsByOffer(offerType: OfferType, hasMarketing: boolean): string[] {
  const common = [
    'Qual o valor ou faixa de investimento (R$)?',
    'Qual o prazo ou duração do projeto?',
    'É recorrente (mensal) ou projeto com entrega única?',
    'Quais são as 3 principais entregas?',
    'Há urgência ou data limite?',
  ];
  const byOffer: Record<OfferType, string[]> = {
    consultoria: ['Quantas sessões ou etapas?', 'Qual resultado o cliente espera?'],
    agencia: ['Quais canais (Meta, Google)?', 'Orçamento de mídia mensal?'],
    recorrente: ['O que está incluso todo mês?', 'SLA de resposta?'],
    saas: ['Quantos usuários ou licenças?', 'Integrações necessárias?'],
    evento: ['Data e formato do evento?', 'Vagas disponíveis?'],
    generico: ['Quem é o público-alvo?', 'Qual o diferencial da oferta?'],
  };
  const extra = byOffer[offerType];
  if (!hasMarketing) {
    return [...common, ...extra, 'Tom: corporativo, criativo ou técnico?'];
  }
  return [...common, ...extra];
}

export function inferOfferPlaceholder(prompt: string, config: UserConfig): string {
  const plan = resolvePlan(config);
  const hasMarketing = plan === 'business';
  const ctx = inferLayoutContext(prompt || 'x', hasMarketing);
  const placeholders: Record<OfferType, string> = {
    consultoria:
      'Ex.: Consultoria B2B por 90 dias — diagnóstico, plano de ação e acompanhamento quinzenal. Investimento R$ 15.000.',
    agencia:
      'Ex.: Gestão de tráfego Meta + Google por 6 meses, criativos e relatórios. Budget R$ 4.500/mês.',
    recorrente:
      'Ex.: Retainer de design — 20h/mês, SLA 24h. Mensalidade R$ 3.200.',
    saas:
      'Ex.: Plataforma SaaS, onboarding e 50 licenças. R$ 890/usuário/mês.',
    evento:
      'Ex.: Workshop 2 dias, 30 vagas, certificado. R$ 1.200/participante.',
    generico:
      'Ex.: Proposta com escopo, cronograma, investimento e CTA de aprovação.',
  };
  return placeholders[ctx.offerType];
}

export function hasMarketingWidgetsForConfig(config: UserConfig): boolean {
  return resolvePlan(config) === 'business';
}

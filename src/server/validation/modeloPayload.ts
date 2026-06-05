import { z } from 'zod';
import { proposalFlowConfigSchema } from './proposalFlow.js';

const builderElement = z.object({}).passthrough();

export const modeloPageLayoutSchema = z.object({
  widthMode: z.enum(['boxed', 'full']),
  horizontalPadding: z.number().min(0).max(120),
  maxContentWidth: z.number().positive().optional(),
}).passthrough();

const optionalUuid = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.string().uuid().nullable().optional(),
);

export const modeloBodySchema = z.object({
  nome: z.string().trim().min(1).max(200),
  elementos: z.array(builderElement).default([]),
  pageLayout: modeloPageLayoutSchema.optional(),
  servicos: z.array(z.string().uuid()).default([]),
  contratoId: optionalUuid,
  contratoTexto: z.string().max(200_000).optional().nullable(),
  chavePix: z.string().max(500).optional().nullable(),
  linkPagamento: z.string().max(2000).optional().nullable(),
  whatsappComprovante: z.string().max(20).optional().nullable(),
  tier: z.enum(['free', 'pro', 'business']).default('free'),
  fluxo: proposalFlowConfigSchema.optional(),
  signatureConfig: z.record(z.unknown()).nullable().optional(),
});

export const modeloPatchSchema = modeloBodySchema.partial();

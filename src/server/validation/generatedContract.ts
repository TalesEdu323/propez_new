import { z } from 'zod';
import { normalizeContractPlaceholders } from '../services/llm/prompts/generateContract.js';

const contractResponseSchema = z.object({
  titulo: z.string().trim().min(1).max(200),
  texto: z.string().trim().min(100).max(50_000),
});

export class ContractValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractValidationError';
  }
}

function stripDangerousHtml(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function validateGeneratedContract(raw: unknown): { titulo: string; texto: string } {
  const parsed = contractResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ContractValidationError('Formato de contrato inválido. Tente reformular sua descrição.');
  }

  return {
    titulo: parsed.data.titulo,
    texto: normalizeContractPlaceholders(stripDangerousHtml(parsed.data.texto)),
  };
}

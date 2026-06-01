import { describe, expect, it } from 'vitest';
import {
  buildContractSystemPrompt,
  buildContractUserPrompt,
  normalizeContractPlaceholders,
} from '../generateContract.js';

describe('buildContractSystemPrompt', () => {
  it('instrui placeholders Propez para contratada e contratante', () => {
    const prompt = buildContractSystemPrompt();
    expect(prompt).toContain('{{EMPRESA_NOME}}');
    expect(prompt).toContain('{{EMPRESA_CNPJ}}');
    expect(prompt).toContain('{{CLIENTE_NOME}}');
    expect(prompt).not.toContain('[NOME CONTRATADA]');
  });
});

describe('buildContractUserPrompt', () => {
  it('inclui bloco da empresa quando contexto informado', () => {
    const user = buildContractUserPrompt('Consultoria por 6 meses', {
      companyName: 'Agência X',
      companyCnpj: '12.345.678/0001-90',
    });
    expect(user).toContain('Agência X');
    expect(user).toContain('12.345.678/0001-90');
    expect(user).toContain('{{EMPRESA_NOME}}');
    expect(user).toContain('{{EMPRESA_CNPJ}}');
  });

  it('omite bloco da empresa sem contexto', () => {
    const user = buildContractUserPrompt('Consultoria por 6 meses', null);
    expect(user).not.toContain('Dados da CONTRATADA');
  });
});

describe('normalizeContractPlaceholders', () => {
  it('converte placeholders legados da IA', () => {
    expect(normalizeContractPlaceholders('[NOME CONTRATADA], CNPJ [CNPJ CONTRATADA]')).toBe(
      '{{EMPRESA_NOME}}, CNPJ {{EMPRESA_CNPJ}}',
    );
    expect(normalizeContractPlaceholders('[NOME CONTRATANTE]')).toBe('{{CLIENTE_NOME}}');
  });
});

import { describe, expect, it } from 'vitest';
import { ApiError } from '../../apiClient';
import {
  ContratoUploadError,
  formatContratoUploadError,
} from '../contratoUploadService';

describe('formatContratoUploadError', () => {
  it('preserva mensagem de ContratoUploadError', () => {
    const err = new ContratoUploadError('Título obrigatório', 'VALIDATION');
    expect(formatContratoUploadError(err)).toBe('Título obrigatório');
  });

  it('mapeia ApiError 401 para mensagem de autenticação', () => {
    const err = new ApiError(401, 'Não autenticado');
    expect(formatContratoUploadError(err)).toBe('Não autenticado');
  });

  it('mapeia ApiError 413 para validação de tamanho', () => {
    const err = new ApiError(413, 'PDF muito grande (máx. 10 MB).');
    expect(formatContratoUploadError(err)).toBe('PDF muito grande (máx. 10 MB).');
  });

  it('usa fallback para erros desconhecidos', () => {
    expect(formatContratoUploadError('oops')).toBe('Erro ao enviar PDF');
  });
});

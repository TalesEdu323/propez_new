import type { ContratoTemplate } from '../store';
import { api, apiFetch, ApiError } from '../apiClient';
import {
  ContratoUploadAbortedError,
  finalizeContratoPdfUpload,
  uploadContratoPdfToBlob,
} from './contratoBlobUpload';
import { getUploadStrategy } from './storageHealth';

export type ContratoUploadErrorCode = 'VALIDATION' | 'NETWORK' | 'STORAGE' | 'AUTH';

export class ContratoUploadError extends Error {
  code: ContratoUploadErrorCode;

  constructor(message: string, code: ContratoUploadErrorCode = 'NETWORK') {
    super(message);
    this.name = 'ContratoUploadError';
    this.code = code;
  }
}

export type EnsureContratoDraftInput = {
  titulo: string;
  texto?: string;
  sourceType: 'text' | 'pdf';
  currentContrato: Partial<ContratoTemplate> | null;
};

export type UploadContratoTemplatePdfInput = {
  contratoId: string;
  file: File;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
};

export type UploadContratoTemplatePdfResult = ContratoTemplate & { pageCount?: number };

function classifyError(err: unknown): ContratoUploadError {
  if (err instanceof ContratoUploadError) return err;
  if (err instanceof ContratoUploadAbortedError) {
    return new ContratoUploadError(err.message, 'NETWORK');
  }
  if (err instanceof ApiError) {
    const code: ContratoUploadErrorCode =
      err.status === 401 ? 'AUTH' : err.status === 413 ? 'VALIDATION' : 'STORAGE';
    return new ContratoUploadError(err.message, code);
  }
  if (err instanceof Error) {
    if (/sessão expirada|login/i.test(err.message)) {
      return new ContratoUploadError(err.message, 'AUTH');
    }
    if (/pdf|arquivo|tamanho|muito grande|inválido/i.test(err.message)) {
      return new ContratoUploadError(err.message, 'VALIDATION');
    }
    if (/blob|armazenamento|storage/i.test(err.message)) {
      return new ContratoUploadError(err.message, 'STORAGE');
    }
    return new ContratoUploadError(err.message, 'NETWORK');
  }
  return new ContratoUploadError('Erro ao enviar PDF', 'NETWORK');
}

export function formatContratoUploadError(err: unknown): string {
  return classifyError(err).message;
}

/** Salva ou atualiza rascunho do contrato antes do upload. Lança ContratoUploadError se falhar. */
export async function ensureContratoDraft(input: EnsureContratoDraftInput): Promise<ContratoTemplate> {
  const titulo = input.titulo.trim();
  if (!titulo) {
    throw new ContratoUploadError('Informe o título do contrato.', 'VALIDATION');
  }

  const current = input.currentContrato;

  if (current?.id) {
    const patch: { titulo?: string; texto?: string; sourceType?: 'text' | 'pdf' } = {};
    if (titulo !== current.titulo?.trim()) patch.titulo = titulo;
    if (input.texto !== undefined) {
      patch.texto = input.texto;
      patch.sourceType = 'text';
    }
    if (Object.keys(patch).length > 0) {
      try {
        return await api.patch<ContratoTemplate>(`/api/contratos/${current.id}`, patch);
      } catch (err) {
        throw classifyError(err);
      }
    }
    return { ...current, titulo } as ContratoTemplate;
  }

  try {
    return await api.post<ContratoTemplate>('/api/contratos', {
      titulo,
      texto: input.texto ?? current?.texto ?? '',
      sourceType: input.sourceType === 'pdf' ? 'text' : input.sourceType,
    });
  } catch (err) {
    throw classifyError(err);
  }
}

async function uploadViaMultipart(
  contratoId: string,
  file: File,
  signal?: AbortSignal,
): Promise<UploadContratoTemplatePdfResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch(`/api/contratos/${contratoId}/upload-pdf`, {
    method: 'POST',
    body: form,
    signal,
  });

  let data: UploadContratoTemplatePdfResult & { error?: string };
  try {
    data = (await res.json()) as UploadContratoTemplatePdfResult & { error?: string };
  } catch {
    throw new ContratoUploadError(
      res.ok ? 'Resposta inválida do servidor.' : `Falha no upload (HTTP ${res.status}).`,
      'NETWORK',
    );
  }

  if (res.status === 401) {
    throw new ContratoUploadError('Sessão expirada. Faça login novamente.', 'AUTH');
  }
  if (!res.ok) {
    throw new ContratoUploadError(
      typeof data.error === 'string' ? data.error : 'Falha no upload do PDF.',
      res.status === 413 ? 'VALIDATION' : 'STORAGE',
    );
  }
  if (!data.id) {
    throw new ContratoUploadError('Resposta inválida do servidor.', 'NETWORK');
  }
  return data;
}

/** Upload unificado: Blob em produção ou multipart em dev. */
export async function uploadContratoTemplatePdf(
  input: UploadContratoTemplatePdfInput,
): Promise<UploadContratoTemplatePdfResult> {
  const { contratoId, file, onProgress, signal } = input;

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new ContratoUploadError('Apenas arquivos PDF são aceitos.', 'VALIDATION');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new ContratoUploadError('PDF muito grande (máx. 10 MB).', 'VALIDATION');
  }

  try {
    const { strategy, multipartMaxBytes } = await getUploadStrategy();

    if (strategy === 'blob') {
      const { blobUrl } = await uploadContratoPdfToBlob(contratoId, file, {
        onProgress,
        signal,
      });
      const finalized = await finalizeContratoPdfUpload(
        contratoId,
        { blobUrl, fileName: file.name, fileSize: file.size },
        signal,
      );
      return finalized as unknown as UploadContratoTemplatePdfResult;
    }

    if (import.meta.env.PROD && file.size > multipartMaxBytes) {
      throw new ContratoUploadError(
        'PDF muito grande para o modo de upload atual. Contate o suporte (armazenamento Blob não configurado).',
        'STORAGE',
      );
    }

    onProgress?.(50);
    const result = await uploadViaMultipart(contratoId, file, signal);
    onProgress?.(100);
    return result;
  } catch (err) {
    throw classifyError(err);
  }
}

/** Remove PDF persistido do template no servidor. */
export async function removeContratoTemplatePdf(contratoId: string): Promise<ContratoTemplate> {
  try {
    return await api.delete<ContratoTemplate>(`/api/contratos/${contratoId}/pdf`);
  } catch (err) {
    throw classifyError(err);
  }
}

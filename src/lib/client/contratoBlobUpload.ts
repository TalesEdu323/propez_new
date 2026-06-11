import { apiFetch } from '../apiClient';

export type ContratoBlobUploadResult = {
  blobUrl: string;
  pathname: string;
};

export class ContratoUploadAbortedError extends Error {
  constructor() {
    super('Upload cancelado');
    this.name = 'ContratoUploadAbortedError';
  }
}

/** Limite seguro para fallback multipart na Function (~4,5 MB). */
export const MULTIPART_FALLBACK_MAX_BYTES = 4 * 1024 * 1024;

const BLOB_API_URL = 'https://blob.vercel-storage.com';
const BLOB_API_VERSION = '7';

type ClientPayload = {
  fileName: string;
  fileSize: number;
  mimeType: string;
};

type GenerateClientTokenResponse = {
  type?: string;
  clientToken?: string;
  error?: string;
};

type BlobPutResponse = {
  url: string;
  pathname: string;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, '_');
}

function storagePathname(contratoId: string, fileName: string): string {
  return `contract-templates/${contratoId}/${sanitizeFileName(fileName)}`;
}

function blobPutUrl(pathname: string): string {
  return `${BLOB_API_URL}/${pathname.split('/').map(encodeURIComponent).join('/')}`;
}

export function mapBlobTokenError(status: number, parsed: GenerateClientTokenResponse | null): string {
  const serverMsg = typeof parsed?.error === 'string' ? parsed.error : '';
  if (status === 401) return 'Sessão expirada. Faça login novamente.';
  if (status === 503 && /BLOB_READ_WRITE_TOKEN|Blob não configurado/i.test(serverMsg)) {
    return 'Armazenamento de PDF não configurado. Contate o suporte.';
  }
  if (status === 413) return 'PDF muito grande (máx. 10 MB).';
  if (serverMsg) return serverMsg;
  return `Falha ao autorizar upload (${status}).`;
}

async function requestClientToken(
  contratoId: string,
  file: File,
  pathname: string,
  signal: AbortSignal | undefined,
): Promise<string> {
  const blobTokenUrl = `/api/contratos/${contratoId}/blob-token`;
  const callbackUrl = new URL(blobTokenUrl, window.location.href).href;
  const clientPayload: ClientPayload = {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/pdf',
  };
  const body = {
    type: 'blob.generate-client-token' as const,
    payload: {
      pathname,
      callbackUrl,
      multipart: false,
      clientPayload: JSON.stringify(clientPayload),
    },
  };

  const res = await apiFetch(blobTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  let parsed: GenerateClientTokenResponse | null = null;
  try {
    parsed = (await res.json()) as GenerateClientTokenResponse;
  } catch {
    parsed = null;
  }

  if (!res.ok || !parsed?.clientToken) {
    throw new Error(mapBlobTokenError(res.status, parsed));
  }

  return parsed.clientToken;
}

function putToBlobWithProgress(
  file: File,
  pathname: string,
  clientToken: string,
  signal: AbortSignal | undefined,
  onProgress: ((percent: number) => void) | undefined,
): Promise<BlobPutResponse> {
  return new Promise((resolve, reject) => {
    const url = blobPutUrl(pathname);
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Authorization', `Bearer ${clientToken}`);
    xhr.setRequestHeader('x-api-version', BLOB_API_VERSION);
    xhr.setRequestHeader('x-content-type', file.type || 'application/pdf');

    const onAbort = () => xhr.abort();
    if (signal) {
      if (signal.aborted) {
        reject(new ContratoUploadAbortedError());
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      signal?.removeEventListener('abort', onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as BlobPutResponse;
          if (!parsed.url) {
            reject(new Error('Resposta inválida do Vercel Blob (sem url).'));
            return;
          }
          resolve(parsed);
        } catch {
          reject(new Error('Resposta inválida do Vercel Blob.'));
        }
        return;
      }
      let detail = '';
      try {
        const parsed = JSON.parse(xhr.responseText) as { error?: { message?: string; code?: string } };
        detail = parsed?.error?.message || parsed?.error?.code || '';
      } catch {
        detail = xhr.responseText?.slice(0, 200) || '';
      }
      reject(new Error(detail || `Falha ao enviar PDF (${xhr.status}).`));
    };

    xhr.onerror = () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new Error('Falha na conexão durante o upload do PDF.'));
    };

    xhr.onabort = () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new ContratoUploadAbortedError());
    };

    xhr.send(file);
  });
}

/** Upload direto ao Vercel Blob (protocolo manual com cookies de sessão). */
export async function uploadContratoPdfToBlob(
  contratoId: string,
  file: File,
  opts?: { onProgress?: (percent: number) => void; signal?: AbortSignal },
): Promise<ContratoBlobUploadResult> {
  const pathname = storagePathname(contratoId, file.name);
  const { signal, onProgress } = opts ?? {};

  if (signal?.aborted) throw new ContratoUploadAbortedError();

  const clientToken = await requestClientToken(contratoId, file, pathname, signal);

  if (signal?.aborted) throw new ContratoUploadAbortedError();

  const blob = await putToBlobWithProgress(file, pathname, clientToken, signal, onProgress);
  onProgress?.(100);

  return { blobUrl: blob.url, pathname: blob.pathname };
}

export async function finalizeContratoPdfUpload(
  contratoId: string,
  payload: {
    blobUrl: string;
    fileName: string;
    fileSize: number;
  },
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const res = await apiFetch(`/api/contratos/${contratoId}/upload-finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (res.status === 401) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Falha ao finalizar upload do PDF.');
  }
  return data;
}

export { shouldUseClientBlobUpload } from './storageHealth.js';

import { upload } from '@vercel/blob/client';
import { apiFetch } from '../apiClient';

export type ContratoBlobUploadResult = {
  blobUrl: string;
  pathname: string;
};

/** Upload direto ao Vercel Blob (contorna limite ~4,5 MB da Function). */
export async function uploadContratoPdfToBlob(
  contratoId: string,
  file: File,
  opts?: { onProgress?: (percent: number) => void; signal?: AbortSignal },
): Promise<ContratoBlobUploadResult> {
  const pathname = `contract-templates/${contratoId}/${file.name.replace(/[^\w.\-() ]+/g, '_')}`;

  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: `/api/contratos/${contratoId}/blob-token`,
    clientPayload: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/pdf',
    }),
    onUploadProgress: opts?.onProgress
      ? (e) => {
          if (!e.total) return;
          opts.onProgress?.(Math.min(100, Math.round((e.loaded / e.total) * 100)));
        }
      : undefined,
    abortSignal: opts?.signal,
  });

  return { blobUrl: blob.url, pathname: blob.pathname };
}

export async function finalizeContratoPdfUpload(
  contratoId: string,
  payload: {
    blobUrl: string;
    fileName: string;
    fileSize: number;
  },
): Promise<Record<string, unknown>> {
  const res = await apiFetch(`/api/contratos/${contratoId}/upload-finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Falha ao finalizar upload');
  return data;
}

export function shouldUseClientBlobUpload(): boolean {
  return import.meta.env.PROD;
}

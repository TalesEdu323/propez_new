import { apiFetch } from '../apiClient';
import { blobToPdfPreviewSource, isPdfBuffer } from '../pdfPreview';
import type { PdfPreviewSource } from '../pdfPreview';
import { buildPdfViewUrl, contratoHasRemotePdf } from '../pdfViewUrl';

export type LoadContratoPreviewOpts = {
  contratoId: string;
  pdfPath?: string | null;
  sourceType?: 'text' | 'pdf';
  signal?: AbortSignal;
};

export type LoadContratoPreviewResult =
  | { ok: true; source: PdfPreviewSource }
  | { ok: false; status?: number; message: string };

async function blobToPreviewResult(blob: Blob): Promise<LoadContratoPreviewResult> {
  if (blob.size < 5) {
    return { ok: false, message: 'O servidor não retornou um PDF válido.' };
  }
  const buf = await blob.arrayBuffer();
  if (!isPdfBuffer(buf)) {
    return {
      ok: false,
      message: 'PDF não encontrado ou inválido. Envie o arquivo novamente na etapa de conteúdo.',
    };
  }
  const source = await blobToPdfPreviewSource(blob);
  if (!source) {
    return { ok: false, message: 'O servidor não retornou um PDF válido.' };
  }
  return { ok: true, source };
}

/** Carrega PDF de preview: URL Blob direta ou rotas API legadas. */
export async function loadContratoPreviewPdf(
  opts: LoadContratoPreviewOpts,
): Promise<LoadContratoPreviewResult> {
  const { contratoId, pdfPath, sourceType, signal } = opts;

  if (pdfPath && contratoHasRemotePdf(pdfPath)) {
    const res = await fetch(buildPdfViewUrl(pdfPath), {
      method: 'GET',
      cache: 'no-store',
      signal,
    });
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message:
          res.status === 404
            ? 'PDF não encontrado no armazenamento. Envie o arquivo novamente.'
            : 'Não foi possível carregar o PDF do armazenamento.',
      };
    }
    return blobToPreviewResult(await res.blob());
  }

  const fetchPdf = async (path: string) => {
    const run = () =>
      apiFetch(`${path}?_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        signal,
      });
    let res = await run();
    if (res.status === 304) res = await run();
    return res;
  };

  let res = await fetchPdf(`/api/contratos/${contratoId}/preview-pdf`);
  if (!res.ok && sourceType === 'pdf') {
    res = await fetchPdf(`/api/contratos/${contratoId}/pdf`);
  }

  if (!res.ok) {
    if (res.status === 401) {
      return { ok: false, status: 401, message: 'Sessão expirada. Faça login novamente.' };
    }
    const err = await res.json().catch(() => ({}));
    const msg =
      typeof err === 'object' && err && 'error' in err && typeof err.error === 'string'
        ? err.error
        : 'Não foi possível carregar o preview do contrato.';
    return { ok: false, status: res.status, message: msg };
  }

  return blobToPreviewResult(await res.blob());
}

/** Indica se o preview deve usar CDN Blob em vez da API. */
export function shouldLoadPreviewFromBlob(pdfPath?: string | null): boolean {
  return contratoHasRemotePdf(pdfPath);
}

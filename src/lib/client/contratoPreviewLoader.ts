import { apiFetch } from '../apiClient';
import { blobToPdfPreviewSource, isPdfBuffer } from '../pdfPreview';
import type { PdfPreviewSource } from '../pdfPreview';
import { buildPdfViewUrl, contratoHasRemotePdf } from '../pdfViewUrl';
import {
  extrairErro,
  logContratoAviso,
  logContratoErro,
  logContratoInfo,
  resumirPdfPath,
} from './contratoDiagnostics';

export type LoadContratoPreviewOpts = {
  contratoId: string;
  pdfPath?: string | null;
  sourceType?: 'text' | 'pdf';
  signal?: AbortSignal;
  /** Pós-upload: tenta API autenticada antes do CDN (propagação Blob). */
  preferApi?: boolean;
};

export type LoadContratoPreviewResult =
  | { ok: true; source: PdfPreviewSource }
  | { ok: false; status?: number; message: string };

async function blobToPreviewResult(
  blob: Blob,
  origem: 'cdn' | 'api',
): Promise<LoadContratoPreviewResult> {
  if (blob.size < 5) {
    const msg = 'O servidor não retornou um PDF válido.';
    logContratoErro('preview:pdf-vazio', msg, { origem, bytes: blob.size });
    return { ok: false, message: msg };
  }
  const buf = await blob.arrayBuffer();
  if (!isPdfBuffer(buf)) {
    const msg = 'PDF não encontrado ou inválido. Envie o arquivo novamente na etapa de conteúdo.';
    logContratoErro('preview:nao-e-pdf', msg, { origem, bytes: blob.size });
    return { ok: false, message: msg };
  }
  const source = await blobToPdfPreviewSource(blob);
  if (!source) {
    const msg = 'O servidor não retornou um PDF válido.';
    logContratoErro('preview:parse-falhou', msg, { origem, bytes: blob.size });
    return { ok: false, message: msg };
  }
  logContratoInfo('preview:ok', { origem, bytes: blob.size });
  return { ok: true, source };
}

async function fetchPreviewFromApi(
  contratoId: string,
  sourceType: 'text' | 'pdf' | undefined,
  signal: AbortSignal | undefined,
  motivoFallback?: string,
): Promise<LoadContratoPreviewResult> {
  logContratoInfo('preview:api-inicio', {
    contratoId,
    sourceType,
    motivoFallback,
  });

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

  const previewPath = `/api/contratos/${contratoId}/preview-pdf`;
  let res = await fetchPdf(previewPath);
  let rotaUsada = previewPath;

  if (!res.ok && sourceType === 'pdf') {
    rotaUsada = `/api/contratos/${contratoId}/pdf`;
    res = await fetchPdf(rotaUsada);
  }

  if (!res.ok) {
    if (res.status === 401) {
      const msg = 'Sessão expirada. Faça login novamente.';
      logContratoErro('preview:api-401', msg, { contratoId, rota: rotaUsada });
      return { ok: false, status: 401, message: msg };
    }
    const err = await res.json().catch(() => ({}));
    const msg =
      typeof err === 'object' && err && 'error' in err && typeof err.error === 'string'
        ? err.error
        : 'Não foi possível carregar o preview do contrato.';
    logContratoErro('preview:api-erro', msg, {
      contratoId,
      rota: rotaUsada,
      httpStatus: res.status,
      corpo: err,
      motivoFallback,
    });
    return { ok: false, status: res.status, message: msg };
  }

  return blobToPreviewResult(await res.blob(), 'api');
}

/** Carrega PDF de preview: tenta CDN Blob e faz fallback na API autenticada. */
export async function loadContratoPreviewPdf(
  opts: LoadContratoPreviewOpts,
): Promise<LoadContratoPreviewResult> {
  const { contratoId, pdfPath, sourceType, signal, preferApi } = opts;

  logContratoInfo('preview:inicio', {
    contratoId,
    sourceType,
    pdfPath: resumirPdfPath(pdfPath),
    viaCdn: Boolean(pdfPath && contratoHasRemotePdf(pdfPath)),
    preferApi: Boolean(preferApi),
  });

  if (pdfPath && contratoHasRemotePdf(pdfPath)) {
    if (preferApi) {
      const fromApi = await fetchPreviewFromApi(
        contratoId,
        sourceType,
        signal,
        'pós-upload (preferApi)',
      );
      if (fromApi.ok) return fromApi;
      logContratoAviso('preview:api-pos-upload-falhou', 'API pós-upload falhou — tentando CDN', {
        contratoId,
        pdfPath: resumirPdfPath(pdfPath),
      });
    }

    const cdnUrl = buildPdfViewUrl(pdfPath);
    try {
      const res = await fetch(cdnUrl, {
        method: 'GET',
        cache: 'no-store',
        signal,
      });
      if (res.ok) {
        const fromCdn = await blobToPreviewResult(await res.blob(), 'cdn');
        if (fromCdn.ok) return fromCdn;
        logContratoAviso('preview:cdn-invalido', 'CDN retornou dados que não são PDF válido', {
          contratoId,
          pdfPath: resumirPdfPath(pdfPath),
        });
      } else {
        logContratoAviso('preview:cdn-http', `CDN respondeu HTTP ${res.status}`, {
          contratoId,
          pdfPath: resumirPdfPath(pdfPath),
          httpStatus: res.status,
        });
      }
    } catch (err) {
      logContratoAviso('preview:cdn-rede', 'Falha ao buscar PDF no CDN — tentando API', {
        contratoId,
        pdfPath: resumirPdfPath(pdfPath),
        ...extrairErro(err),
      });
    }

    if (!preferApi) {
      return fetchPreviewFromApi(
        contratoId,
        sourceType,
        signal,
        'CDN indisponível ou resposta inválida',
      );
    }

    return {
      ok: false,
      message:
        'PDF enviado com sucesso. Aguarde alguns segundos e clique em Recarregar preview.',
    };
  }

  return fetchPreviewFromApi(contratoId, sourceType, signal);
}

/** Indica se o preview deve usar CDN Blob em vez da API. */
export function shouldLoadPreviewFromBlob(pdfPath?: string | null): boolean {
  return contratoHasRemotePdf(pdfPath);
}

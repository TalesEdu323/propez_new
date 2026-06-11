import { pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let configured = false;

/** Garante worker na mesma versão do bundle (evita mismatch pós-deploy/PWA). */
export function setupPdfWorker() {
  if (configured) return;
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  configured = true;
}

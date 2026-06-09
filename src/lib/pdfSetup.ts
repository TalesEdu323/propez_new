import { pdfjs } from 'react-pdf';

let configured = false;

export function setupPdfWorker() {
  if (configured) return;
  pdfjs.GlobalWorkerOptions.workerSrc = import.meta.env.PROD
    ? '/pdf.worker.min.mjs'
    : new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  configured = true;
}

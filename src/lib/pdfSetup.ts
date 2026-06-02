import { pdfjs } from 'react-pdf';

let configured = false;

export function setupPdfWorker() {
  if (configured) return;
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  configured = true;
}

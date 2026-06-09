import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const dest = path.join(root, '../public/pdf.worker.min.mjs');

if (!fs.existsSync(src)) {
  console.error('[copy-pdf-worker] pdfjs worker não encontrado:', src);
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log('[copy-pdf-worker] copiado para public/pdf.worker.min.mjs');

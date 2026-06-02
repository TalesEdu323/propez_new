import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads', 'contracts');

export async function ensureContractStorage(): Promise<string> {
  await mkdir(UPLOADS_ROOT, { recursive: true });
  await mkdir(path.join(UPLOADS_ROOT, 'signed'), { recursive: true });
  return UPLOADS_ROOT;
}

export function originalPdfRelativePath(documentId: string): string {
  return path.join('uploads', 'contracts', `${documentId}_original.pdf`);
}

export function signedPdfRelativePath(documentId: string): string {
  return path.join('uploads', 'contracts', 'signed', `${documentId}_signed.pdf`);
}

export function absoluteFromRelative(relativePath: string): string {
  return path.join(process.cwd(), relativePath.replace(/\//g, path.sep));
}

export async function writePdf(relativePath: string, buffer: Buffer): Promise<string> {
  const abs = absoluteFromRelative(relativePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buffer);
  return relativePath;
}

export async function readPdf(relativePath: string): Promise<Buffer> {
  return readFile(absoluteFromRelative(relativePath));
}

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';

export type PdfStoreContext = { pool: Pool };

type PdfKind = 'original' | 'signed' | 'final';

import { usesDbPdfStorage } from '../pdfStorageEnv.js';

export { usesDbPdfStorage };

function uploadsRoot(): string {
  if (usesDbPdfStorage()) {
    return path.join('/tmp', 'propez-uploads');
  }
  return path.join(process.cwd(), 'uploads');
}

export async function ensureContractStorage(): Promise<string> {
  const root = path.join(uploadsRoot(), 'contracts');
  await mkdir(root, { recursive: true });
  await mkdir(path.join(root, 'signed'), { recursive: true });
  return root;
}

export function originalPdfRelativePath(documentId: string): string {
  return path.join('uploads', 'contracts', `${documentId}_original.pdf`);
}

export function signedPdfRelativePath(documentId: string): string {
  return path.join('uploads', 'contracts', 'signed', `${documentId}_signed.pdf`);
}

export function absoluteFromRelative(relativePath: string): string {
  const normalized = relativePath.replace(/^uploads[/\\]/, '');
  return path.join(uploadsRoot(), normalized.replace(/\//g, path.sep));
}

function parsePdfRelativePath(relativePath: string): { documentId: string; kind: PdfKind } | null {
  const name = path.basename(relativePath.replace(/\\/g, '/'));
  const match = name.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(original|signed|final)\.pdf$/i,
  );
  if (!match) return null;
  return { documentId: match[1], kind: match[2].toLowerCase() as PdfKind };
}

async function writePdfToDb(
  pool: Pool,
  documentId: string,
  kind: PdfKind,
  buffer: Buffer,
): Promise<void> {
  const column = kind === 'original' ? 'original_pdf_data' : 'signed_pdf_data';
  await pool.query(`UPDATE contract_documents SET ${column} = $2 WHERE id = $1`, [documentId, buffer]);
}

async function readPdfFromDb(
  pool: Pool,
  documentId: string,
  kind: PdfKind,
): Promise<Buffer | null> {
  const column = kind === 'original' ? 'original_pdf_data' : 'signed_pdf_data';
  const { rows } = await pool.query<{ data: Buffer | null }>(
    `SELECT ${column} AS data FROM contract_documents WHERE id = $1`,
    [documentId],
  );
  const data = rows[0]?.data;
  if (!data) return null;
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

export async function writePdf(
  relativePath: string,
  buffer: Buffer,
  ctx?: PdfStoreContext,
): Promise<string> {
  const parsed = parsePdfRelativePath(relativePath);

  if (ctx?.pool && parsed) {
    await writePdfToDb(ctx.pool, parsed.documentId, parsed.kind, buffer);
  }

  if (!usesDbPdfStorage()) {
    const abs = absoluteFromRelative(relativePath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, buffer);
  }

  return relativePath;
}

export async function readPdf(relativePath: string, ctx?: PdfStoreContext): Promise<Buffer> {
  const parsed = parsePdfRelativePath(relativePath);

  if (ctx?.pool && parsed) {
    const fromDb = await readPdfFromDb(ctx.pool, parsed.documentId, parsed.kind);
    if (fromDb) return fromDb;
  }

  if (!usesDbPdfStorage()) {
    return readFile(absoluteFromRelative(relativePath));
  }

  throw new Error('PDF do contrato não encontrado');
}

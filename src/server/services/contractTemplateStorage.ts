import { access } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';
import {
  deletePdfFromStorage,
  isBlobUrl,
  readPdfFromStorage,
  savePdfToStorage,
  shouldUseVercelBlob,
} from '../storage/blobStorage.js';
import { usesDbPdfStorage } from './pdfStorageEnv.js';

const ROOT = path.join(process.cwd(), 'uploads', 'contract-templates');

export interface TemplatePdfRef {
  pool: Pool;
  orgId: string;
  contratoId: string;
  pdfPath?: string | null;
}

export function templatePdfRelativePath(orgId: string, contratoId: string): string {
  return path.join('uploads', 'contract-templates', orgId, `${contratoId}.pdf`);
}

export function templatePdfStorageKey(orgId: string, contratoId: string): string {
  return `contract-templates/${orgId}/${contratoId}.pdf`;
}

function absoluteFromRelative(relativePath: string): string {
  const base = usesDbPdfStorage() ? path.join('/tmp', 'propez-uploads') : process.cwd();
  return path.join(base, relativePath.replace(/^uploads[/\\]/, '').replace(/\//g, path.sep));
}

function bufferFromRow(data: unknown): Buffer | null {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === 'string') {
    if (data.startsWith('\\x')) return Buffer.from(data.slice(2), 'hex');
    return Buffer.from(data, 'binary');
  }
  return Buffer.from(data as Uint8Array);
}

function pgErrorCode(err: unknown): string {
  return err && typeof err === 'object' && 'code' in err
    ? String((err as { code: string }).code)
    : '';
}

/** Garante coluna pdf_data (migration 022) mesmo se startup migrations não rodou. */
export async function ensureContratoTemplatePdfColumn(pool: Pool): Promise<void> {
  await pool.query(`ALTER TABLE contratos_templates ADD COLUMN IF NOT EXISTS pdf_data BYTEA`);
}

async function readTemplatePdfFromDb(ref: TemplatePdfRef): Promise<Buffer | null> {
  await ensureContratoTemplatePdfColumn(ref.pool);
  const { rows } = await ref.pool.query<{ pdf_data: Buffer | null }>(
    `SELECT pdf_data FROM contratos_templates WHERE organization_id = $1 AND id = $2`,
    [ref.orgId, ref.contratoId],
  );
  return bufferFromRow(rows[0]?.pdf_data);
}

async function localPdfExists(relativePath: string): Promise<boolean> {
  try {
    await access(absoluteFromRelative(relativePath));
    return true;
  } catch {
    return false;
  }
}

/** Verifica se o template tem PDF persistido (Blob URL, BYTEA legado ou disco). */
export async function templatePdfExists(ref: TemplatePdfRef): Promise<boolean> {
  await ensureContratoTemplatePdfColumn(ref.pool);
  const { rows } = await ref.pool.query<{ pdf_path: string | null; has_bytes: boolean }>(
    `SELECT pdf_path,
            (pdf_data IS NOT NULL AND length(pdf_data) > 0) AS has_bytes
     FROM contratos_templates WHERE organization_id = $1 AND id = $2`,
    [ref.orgId, ref.contratoId],
  );
  const row = rows[0];
  if (!row) return false;
  if (row.pdf_path && isBlobUrl(row.pdf_path)) return true;
  if (row.has_bytes) return true;
  if (row.pdf_path) return localPdfExists(row.pdf_path);
  return localPdfExists(templatePdfRelativePath(ref.orgId, ref.contratoId));
}

async function writeTemplatePdfToDb(ref: TemplatePdfRef, buffer: Buffer | null): Promise<void> {
  await ensureContratoTemplatePdfColumn(ref.pool);
  const result = await ref.pool.query(
    `UPDATE contratos_templates SET pdf_data = $3 WHERE organization_id = $1 AND id = $2`,
    [ref.orgId, ref.contratoId, buffer],
  );
  if ((result.rowCount ?? 0) === 0) {
    throw new Error('Contrato não encontrado para salvar o PDF');
  }
}

export async function clearTemplatePdfData(ref: TemplatePdfRef): Promise<void> {
  await ensureContratoTemplatePdfColumn(ref.pool);
  await ref.pool.query(
    `UPDATE contratos_templates SET pdf_data = NULL WHERE organization_id = $1 AND id = $2`,
    [ref.orgId, ref.contratoId],
  );
}

export async function ensureTemplateStorage(orgId: string): Promise<string> {
  const dir = usesDbPdfStorage()
    ? path.join('/tmp', 'propez-uploads', 'contract-templates', orgId)
    : path.join(ROOT, orgId);
  const { mkdir } = await import('node:fs/promises');
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeTemplatePdf(
  pool: Pool,
  orgId: string,
  contratoId: string,
  buffer: Buffer,
  existingPdfPath?: string | null,
): Promise<string> {
  const ref: TemplatePdfRef = { pool, orgId, contratoId };
  const storageKey = templatePdfStorageKey(orgId, contratoId);
  const storedPath = await savePdfToStorage(buffer, storageKey);

  if (shouldUseVercelBlob()) {
    await writeTemplatePdfToDb(ref, null);
  } else {
    await writeTemplatePdfToDb(ref, buffer);
  }

  if (existingPdfPath && existingPdfPath !== storedPath) {
    await deletePdfFromStorage(existingPdfPath);
  }

  return storedPath;
}

/** Registra URL do Blob após upload direto do cliente (sem re-put no servidor). */
export async function registerTemplatePdfBlobUrl(
  pool: Pool,
  orgId: string,
  contratoId: string,
  blobUrl: string,
  existingPdfPath?: string | null,
): Promise<void> {
  const ref: TemplatePdfRef = { pool, orgId, contratoId };
  await clearTemplatePdfData(ref);
  if (existingPdfPath && existingPdfPath !== blobUrl) {
    await deletePdfFromStorage(existingPdfPath);
  }
}

export async function readTemplatePdf(ref: TemplatePdfRef): Promise<Buffer> {
  const { rows } = await ref.pool.query<{ pdf_path: string | null }>(
    `SELECT pdf_path FROM contratos_templates WHERE organization_id = $1 AND id = $2`,
    [ref.orgId, ref.contratoId],
  );
  const pdfPath = rows[0]?.pdf_path ?? ref.pdfPath;

  if (pdfPath && isBlobUrl(pdfPath)) {
    return readPdfFromStorage(pdfPath);
  }

  const fromDb = await readTemplatePdfFromDb(ref);
  if (fromDb && fromDb.length > 0) return fromDb;

  if (usesDbPdfStorage() && !pdfPath) {
    console.warn('[contractTemplateStorage] PDF ausente (serverless)', {
      contratoId: ref.contratoId,
      orgId: ref.orgId,
    });
    throw new Error('PDF do template de contrato não encontrado');
  }

  const rel = pdfPath ?? templatePdfRelativePath(ref.orgId, ref.contratoId);
  try {
    return await readPdfFromStorage(rel);
  } catch {
    console.warn('[contractTemplateStorage] PDF ausente no disco', {
      contratoId: ref.contratoId,
      orgId: ref.orgId,
      pdfPath: rel,
    });
  }

  throw new Error('PDF do template de contrato não encontrado');
}

export async function deleteTemplatePdf(
  ref: TemplatePdfRef,
  pdfPath?: string | null,
): Promise<void> {
  await clearTemplatePdfData(ref);
  const stored = pdfPath ?? ref.pdfPath ?? templatePdfRelativePath(ref.orgId, ref.contratoId);
  await deletePdfFromStorage(stored);
}

export function uploadPdfErrorMessage(err: unknown): string {
  const code = pgErrorCode(err);
  if (code === '42703') {
    return 'Banco de dados desatualizado (pdf_data). Contate o suporte ou tente novamente em alguns minutos.';
  }
  if (code === 'ENOENT' || code === 'EROFS' || code === 'EACCES') {
    return 'Não foi possível armazenar o PDF no servidor. Tente novamente.';
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/Falha ao ler PDF do Blob/i.test(msg)) {
    return 'Não foi possível validar o PDF enviado. Tente o upload novamente.';
  }
  if (/BLOB_READ_WRITE_TOKEN/i.test(msg)) {
    return 'Armazenamento de PDF não configurado (BLOB_READ_WRITE_TOKEN). Contate o suporte.';
  }
  if (/não encontrado para salvar/i.test(msg)) {
    return 'Contrato não encontrado. Salve o rascunho e tente o upload novamente.';
  }
  if (/invalid pdf|encrypted|password/i.test(msg)) {
    return 'PDF inválido, protegido por senha ou corrompido.';
  }
  return 'Arquivo PDF inválido ou corrompido';
}

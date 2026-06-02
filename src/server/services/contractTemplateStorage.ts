import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';
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

function absoluteFromRelative(relativePath: string): string {
  const base = usesDbPdfStorage() ? path.join('/tmp', 'propez-uploads') : process.cwd();
  return path.join(base, relativePath.replace(/^uploads[/\\]/, '').replace(/\//g, path.sep));
}

function bufferFromRow(data: unknown): Buffer | null {
  if (!data) return null;
  return Buffer.isBuffer(data) ? data : Buffer.from(data as Uint8Array);
}

async function readTemplatePdfFromDb(ref: TemplatePdfRef): Promise<Buffer | null> {
  const { rows } = await ref.pool.query<{ pdf_data: Buffer | null }>(
    `SELECT pdf_data FROM contratos_templates WHERE organization_id = $1 AND id = $2`,
    [ref.orgId, ref.contratoId],
  );
  return bufferFromRow(rows[0]?.pdf_data);
}

async function writeTemplatePdfToDb(ref: TemplatePdfRef, buffer: Buffer): Promise<void> {
  await ref.pool.query(
    `UPDATE contratos_templates SET pdf_data = $3 WHERE organization_id = $1 AND id = $2`,
    [ref.orgId, ref.contratoId, buffer],
  );
}

export async function clearTemplatePdfData(ref: TemplatePdfRef): Promise<void> {
  await ref.pool.query(
    `UPDATE contratos_templates SET pdf_data = NULL WHERE organization_id = $1 AND id = $2`,
    [ref.orgId, ref.contratoId],
  );
}

export async function ensureTemplateStorage(orgId: string): Promise<string> {
  const dir = usesDbPdfStorage()
    ? path.join('/tmp', 'propez-uploads', 'contract-templates', orgId)
    : path.join(ROOT, orgId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeTemplatePdf(
  pool: Pool,
  orgId: string,
  contratoId: string,
  buffer: Buffer,
): Promise<string> {
  const ref: TemplatePdfRef = { pool, orgId, contratoId };
  await writeTemplatePdfToDb(ref, buffer);

  const rel = templatePdfRelativePath(orgId, contratoId);
  if (!usesDbPdfStorage()) {
    await ensureTemplateStorage(orgId);
    await writeFile(absoluteFromRelative(rel), buffer);
  }
  return rel;
}

export async function readTemplatePdf(ref: TemplatePdfRef): Promise<Buffer> {
  const fromDb = await readTemplatePdfFromDb(ref);
  if (fromDb && fromDb.length > 0) return fromDb;

  const rel = ref.pdfPath ?? templatePdfRelativePath(ref.orgId, ref.contratoId);
  if (!usesDbPdfStorage() || ref.pdfPath) {
    try {
      return await readFile(absoluteFromRelative(rel));
    } catch {
      /* try below */
    }
  }

  throw new Error('PDF do template de contrato não encontrado');
}

export async function deleteTemplatePdf(
  ref: TemplatePdfRef,
  pdfPath?: string | null,
): Promise<void> {
  await clearTemplatePdfData(ref);
  const rel = pdfPath ?? templatePdfRelativePath(ref.orgId, ref.contratoId);
  try {
    await unlink(absoluteFromRelative(rel));
  } catch {
    /* ignore */
  }
}

export function uploadPdfErrorMessage(err: unknown): string {
  const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
  if (code === 'ENOENT' || code === 'EROFS' || code === 'EACCES') {
    return 'Não foi possível armazenar o PDF no servidor. Tente novamente.';
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/invalid pdf|encrypted|password/i.test(msg)) {
    return 'PDF inválido, protegido por senha ou corrompido.';
  }
  return 'Arquivo PDF inválido ou corrompido';
}

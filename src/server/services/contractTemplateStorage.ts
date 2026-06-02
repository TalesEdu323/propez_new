import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'uploads', 'contract-templates');

export function templatePdfRelativePath(orgId: string, contratoId: string): string {
  return path.join('uploads', 'contract-templates', orgId, `${contratoId}.pdf`);
}

function absoluteFromRelative(relativePath: string): string {
  return path.join(process.cwd(), relativePath.replace(/\//g, path.sep));
}

export async function ensureTemplateStorage(orgId: string): Promise<string> {
  const dir = path.join(ROOT, orgId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeTemplatePdf(orgId: string, contratoId: string, buffer: Buffer): Promise<string> {
  await ensureTemplateStorage(orgId);
  const rel = templatePdfRelativePath(orgId, contratoId);
  const abs = absoluteFromRelative(rel);
  await writeFile(abs, buffer);
  return rel;
}

export async function readTemplatePdf(relativePath: string): Promise<Buffer> {
  return readFile(absoluteFromRelative(relativePath));
}

export async function deleteTemplatePdf(relativePath: string | null | undefined): Promise<void> {
  if (!relativePath) return;
  try {
    await unlink(absoluteFromRelative(relativePath));
  } catch {
    /* ignore */
  }
}

import { del, put } from '@vercel/blob';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { isBlobUrl as isBlobUrlShared, isAllowedBlobUrl as isAllowedBlobUrlShared } from '../../lib/blobUrl.js';

export function isBlobUrl(urlOrPath: string): boolean {
  return isBlobUrlShared(urlOrPath);
}

export function isAllowedBlobUrl(url: string): boolean {
  return isAllowedBlobUrlShared(url);
}

/** Token injetado pela Vercel ao ligar o Blob Store (Production + Preview). */
export function getBlobReadWriteToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined;
}

export function shouldUseVercelBlob(): boolean {
  const onVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  const isProd = process.env.NODE_ENV === 'production';
  return (onVercel || isProd) && Boolean(getBlobReadWriteToken());
}

export async function savePdfToStorage(buffer: Buffer, storageKey: string): Promise<string> {
  const key = storageKey.replace(/\\/g, '/');

  if (shouldUseVercelBlob()) {
    const token = getBlobReadWriteToken()!;
    const blob = await put(key, buffer, {
      access: 'public',
      addRandomSuffix: false,
      token,
      contentType: 'application/pdf',
    });
    return blob.url;
  }

  const rel = key.startsWith('uploads/') ? key : `uploads/${key}`;
  const abs = path.join(process.cwd(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buffer);
  return rel;
}

export async function readPdfFromStorage(urlOrPath: string): Promise<Buffer> {
  if (isBlobUrl(urlOrPath)) {
    const res = await fetch(urlOrPath);
    if (!res.ok) {
      throw new Error(`Falha ao ler PDF do Blob (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  const rel = urlOrPath.startsWith('uploads/') ? urlOrPath : `uploads/${urlOrPath}`;
  return readFile(path.join(process.cwd(), rel));
}

export async function deletePdfFromStorage(urlOrPath: string | null | undefined): Promise<void> {
  if (!urlOrPath) return;

  if (isBlobUrl(urlOrPath)) {
    const token = getBlobReadWriteToken();
    if (!token) return;
    try {
      await del(urlOrPath, { token });
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    const rel = urlOrPath.startsWith('uploads/') ? urlOrPath : `uploads/${urlOrPath}`;
    await unlink(path.join(process.cwd(), rel));
  } catch {
    /* ignore */
  }
}

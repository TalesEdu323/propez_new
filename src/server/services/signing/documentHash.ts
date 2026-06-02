import { createHash } from 'node:crypto';

export function sha256Buffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function buildValidationCode(documentId: string, signerCount: number): string {
  const id = documentId.replace(/-/g, '');
  const a = id.substring(0, 4).toUpperCase();
  const b = id.substring(4, 8).toUpperCase();
  return `${a}-${b}-${String(signerCount).padStart(4, '0')}`;
}

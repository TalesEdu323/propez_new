/** Fonte de PDF para react-pdf (evita blob: revogado entre etapas do wizard). */
export type PdfPreviewSource = { data: Uint8Array };

export function isPdfBytes(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 5) return false;
  const h = new Uint8Array(buf, 0, 5);
  return h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46 && h[4] === 0x2d;
}

export async function blobToPdfPreviewSource(blob: Blob): Promise<PdfPreviewSource | null> {
  const buf = await blob.arrayBuffer();
  if (!isPdfBytes(buf)) return null;
  return { data: new Uint8Array(buf) };
}

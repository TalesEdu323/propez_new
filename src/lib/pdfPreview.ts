/** Fonte de PDF para react-pdf (evita blob: revogado entre etapas do wizard). */
export type PdfPreviewSource = { data: Uint8Array };

function toUint8Array(buf: ArrayBuffer | Buffer): Uint8Array {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(buf)) {
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  if (buf instanceof ArrayBuffer) {
    return new Uint8Array(buf);
  }
  return new Uint8Array(buf as ArrayBuffer);
}

export function isPdfBuffer(buf: ArrayBuffer | Buffer): boolean {
  const view = toUint8Array(buf);
  if (view.byteLength < 5) return false;
  return view[0] === 0x25 && view[1] === 0x50 && view[2] === 0x44 && view[3] === 0x46 && view[4] === 0x2d;
}

export function isPdfBytes(buf: ArrayBuffer): boolean {
  return isPdfBuffer(buf);
}

export async function blobToPdfPreviewSource(blob: Blob): Promise<PdfPreviewSource | null> {
  const buf = await blob.arrayBuffer();
  if (!isPdfBytes(buf)) return null;
  return { data: new Uint8Array(buf) };
}

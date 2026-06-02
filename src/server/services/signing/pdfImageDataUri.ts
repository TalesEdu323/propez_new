/** pdfmake só embute PNG/JPEG em data URLs. */

export function isPdfMakeImageDataUri(uri: string): boolean {
  return /^data:image\/(png|jpe?g);base64,/i.test(uri.trim());
}

export function toPdfMakeImageDataUri(uri: string | null | undefined): string | null {
  if (!uri?.trim()) return null;
  const t = uri.trim();
  return isPdfMakeImageDataUri(t) ? t : null;
}

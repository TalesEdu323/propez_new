/**
 * Assinatura visual da organização: upload existente ou gerada pelo nome.
 */

export async function resolveOrgSignatureDataUri(input: {
  signatureUrl?: string | null;
  orgName: string;
}): Promise<string | null> {
  const url = input.signatureUrl?.trim();
  if (url) {
    if (url.startsWith('data:image/')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const res = await fetch(url);
        if (!res.ok) return generateTypographicSignature(input.orgName);
        const buf = Buffer.from(await res.arrayBuffer());
        const ct = res.headers.get('content-type') || 'image/png';
        return `data:${ct};base64,${buf.toString('base64')}`;
      } catch {
        return generateTypographicSignature(input.orgName);
      }
    }
    return url;
  }
  return generateTypographicSignature(input.orgName);
}

export function generateTypographicSignature(orgName: string): string {
  const name = (orgName || 'Organização').trim().slice(0, 48);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80">
    <text x="8" y="52" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-style="italic" fill="#1a1a1a">${escapeXml(name)}</text>
    <line x1="8" y1="62" x2="312" y2="62" stroke="#888" stroke-width="1"/>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

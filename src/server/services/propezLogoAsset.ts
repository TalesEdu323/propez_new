import fs from 'node:fs'
import path from 'node:path'

let cachedLogoDataUri: string | null | undefined

/**
 * Logo PropEZ embutido para PDF (data URI). pdfmake pode não renderizar SVG em
 * todos os ambientes — nesse caso o PDF usa fallback textual no contrato.
 */
export function getPropezLogoDataUri(): string | null {
  if (cachedLogoDataUri !== undefined) return cachedLogoDataUri
  try {
    const svgPath = path.join(process.cwd(), 'public', 'logo.svg')
    const svg = fs.readFileSync(svgPath, 'utf8')
    cachedLogoDataUri = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
  } catch (err) {
    console.warn('[propezLogoAsset] não foi possível carregar logo.svg:', err)
    cachedLogoDataUri = null
  }
  return cachedLogoDataUri
}

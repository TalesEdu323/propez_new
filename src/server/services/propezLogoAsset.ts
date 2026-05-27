/**
 * Logo PropEZ embutido para PDF (data URI). pdfmake não renderiza SVG em data
 * URLs — retornamos null e o contrato usa fallback textual "PropEZ".
 */
export function getPropezLogoDataUri(): string | null {
  return null
}

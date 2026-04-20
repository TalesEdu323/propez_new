/**
 * Geração server-side do PDF do contrato a partir do texto da proposta.
 *
 * Usa `pdfmake` (v0.3.x) em modo Node. A API recomendada nessa versão é
 * o singleton exportado pelo pacote:
 *
 *   import pdfMake from 'pdfmake'
 *   pdfMake.fonts = { Roboto: { ... paths ... } }
 *   const pdf = pdfMake.createPdf(docDefinition)
 *   const buffer = await pdf.getBuffer()
 *
 * Nota: O PDF aqui é do **contrato** (texto). A proposta visual (builder) não
 * é renderizada 1:1; se for requisito futuramente, trocar para puppeteer.
 */

import path from 'node:path'
import { createRequire } from 'node:module'
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'

const require = createRequire(import.meta.url)
// Import dinâmico via CJS: `pdfmake` v0.3 expõe o singleton como
// `module.exports`, não como ES default export, então precisamos do require.
const pdfMake: {
  fonts?: Record<string, Record<string, string>>
  createPdf: (doc: TDocumentDefinitions) => { getBuffer: () => Promise<Buffer> }
  setUrlAccessPolicy?: (cb: (url: string) => boolean) => void
} = require('pdfmake')

// No pdfmake v0.3, os arquivos .ttf ficam em `fonts/Roboto/*.ttf`.
const fontsDir = path.join(path.dirname(require.resolve('pdfmake/fonts/Roboto.js')), 'Roboto')

pdfMake.fonts = {
  Roboto: {
    normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
    bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
    italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
    bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf'),
  },
}

// Por padrão, nega qualquer download externo (imagens de URL). Assinamos só o
// conteúdo textual do contrato; imagens remotas ficam bloqueadas por segurança.
pdfMake.setUrlAccessPolicy?.(() => false)

export interface ContractPdfInput {
  /** Título do contrato (vai como cabeçalho e título do PDF). */
  title: string
  /** Corpo do contrato — texto corrido, aceita `\n` para quebras de parágrafo. */
  body: string
  clientName: string
  clientDocument?: string
  companyName?: string
  companyCnpj?: string
  /** Valor em reais (opcional). */
  value?: number
  /** Data de emissão; default = hoje. */
  issuedAt?: Date
  /** Nome da cidade/local de assinatura (ex.: "São Paulo"). */
  location?: string
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(d)
}

export async function generateContractPdf(input: ContractPdfInput): Promise<Buffer> {
  const issuedAt = input.issuedAt ?? new Date()

  const headerLines: Content[] = []
  if (input.companyName) {
    headerLines.push({ text: input.companyName, style: 'companyName' })
  }
  if (input.companyCnpj) {
    headerLines.push({ text: `CNPJ: ${input.companyCnpj}`, style: 'companyMeta' })
  }

  const paragraphs: Content[] = (input.body || '')
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ text: p, style: 'paragraph', margin: [0, 0, 0, 10] }))

  const signatureLine = {
    margin: [0, 40, 0, 0] as [number, number, number, number],
    columns: [
      {
        stack: [
          { text: '________________________________________', alignment: 'center' },
          {
            text: input.clientName,
            alignment: 'center',
            bold: true,
            margin: [0, 4, 0, 0] as [number, number, number, number],
          },
          input.clientDocument
            ? { text: `Doc.: ${input.clientDocument}`, alignment: 'center', fontSize: 9 }
            : (null as unknown as Content),
        ].filter(Boolean) as Content[],
      },
    ],
  } as Content

  const valueLine: Content | null =
    typeof input.value === 'number' && !Number.isNaN(input.value)
      ? {
          text: `Valor total: ${fmtCurrency(input.value)}`,
          style: 'valueLine',
          margin: [0, 10, 0, 10],
        }
      : null

  const docDefinition: TDocumentDefinitions = {
    info: {
      title: input.title,
      author: input.companyName || 'Propez',
      creator: 'Propez',
    },
    pageSize: 'A4',
    pageMargins: [60, 60, 60, 60],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      lineHeight: 1.35,
    },
    styles: {
      companyName: { fontSize: 13, bold: true, alignment: 'right' },
      companyMeta: { fontSize: 9, alignment: 'right', color: '#555555' },
      title: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 20, 0, 20] },
      paragraph: { alignment: 'justify' },
      valueLine: { bold: true, fontSize: 12 },
      footer: { fontSize: 9, color: '#666' },
    },
    content: [
      ...headerLines,
      { text: input.title, style: 'title' },
      ...paragraphs,
      ...(valueLine ? [valueLine] : []),
      {
        text: `${input.location || ''}${input.location ? ', ' : ''}${fmtDate(issuedAt)}.`,
        margin: [0, 20, 0, 0],
      },
      signatureLine,
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount}`,
      alignment: 'center',
      style: 'footer',
      margin: [0, 10, 0, 0],
    }),
  }

  const pdf = pdfMake.createPdf(docDefinition)
  return pdf.getBuffer()
}

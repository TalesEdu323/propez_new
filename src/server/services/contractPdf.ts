/**
 * Geração server-side do PDF do contrato a partir do texto da proposta.
 *
 * pdfmake é carregado sob demanda (lazy) para não derrubar o cold start na Vercel.
 */

import path from 'node:path'
import { createRequire } from 'node:module'
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'
import { getPropezLogoDataUri } from './propezLogoAsset.js'

type PdfMakeInstance = {
  fonts?: Record<string, Record<string, string>>
  createPdf: (doc: TDocumentDefinitions) => { getBuffer: () => Promise<Buffer> }
  setUrlAccessPolicy?: (cb: (url: string) => boolean) => void
}

let pdfMakeInstance: PdfMakeInstance | null = null

function getPdfMake(): PdfMakeInstance {
  if (pdfMakeInstance) return pdfMakeInstance

  const require = createRequire(import.meta.url)
  const pdfMake = require('pdfmake') as PdfMakeInstance

  const fontsDir = path.join(
    path.dirname(require.resolve('pdfmake/fonts/Roboto.js')),
    'Roboto',
  )

  pdfMake.fonts = {
    Roboto: {
      normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
      bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
      italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
      bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf'),
    },
  }

  pdfMake.setUrlAccessPolicy?.(() => false)
  pdfMakeInstance = pdfMake
  return pdfMake
}

export interface ContractPdfInput {
  title: string
  body: string
  clientName: string
  clientDocument?: string
  companyName?: string
  companyCnpj?: string
  value?: number
  issuedAt?: Date
  location?: string
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(d)
}

export async function generateContractPdf(input: ContractPdfInput): Promise<Buffer> {
  const pdfMake = getPdfMake()
  const issuedAt = input.issuedAt ?? new Date()

  const logoUri = getPropezLogoDataUri()
  const headerLines: Content[] = []

  const brandHeader: Content = logoUri
    ? {
        columns: [
          { width: '*', text: '' },
          { image: logoUri, width: 140, alignment: 'right' },
        ],
        margin: [0, 0, 0, 12] as [number, number, number, number],
      }
    : {
        text: 'PropEZ',
        style: 'brandFallback',
        alignment: 'right',
        margin: [0, 0, 0, 12] as [number, number, number, number],
      }

  headerLines.push(brandHeader)

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
      brandFallback: { fontSize: 16, bold: true, alignment: 'right', color: '#ff5200' },
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

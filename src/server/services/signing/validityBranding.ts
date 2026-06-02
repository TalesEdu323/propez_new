export const VALIDITY_BRANDING = {
  confidentialWatermark: 'Confidential • PropEZ',
  signerBadge: 'Assinatura digital PropEZ',
  creditLine: 'Assinatura digital PropEZ · Powered by Taggo',
  termsLabel: 'Termos de Uso da PropEZ',
  legalFooter: (documentId: string) =>
    `PropEZ ${documentId}. Contrato assinado eletronicamente na plataforma PropEZ. Conforme MP 2.200-2/2001, Lei 14.063/2020 e controles de segurança alinhados à LGPD.`,
  logFooter: (documentId: string) =>
    `Este log é exclusivo e parte integrante do documento número ${documentId}, segundo os Termos de Uso da PropEZ.`,
  emailNotice:
    'Assinatura digital realizada na PropEZ. Documento com validade jurídica conforme MP 2.200-2/2001 e Lei 14.063/2020.',
  emailSignedNotice:
    'Contrato assinado eletronicamente na PropEZ. Segue em anexo o documento assinado por ambas as partes.',
  emailInviteNotice: 'Assinatura digital na PropEZ.',
} as const;

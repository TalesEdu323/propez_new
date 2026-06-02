export const VALIDITY_BRANDING = {
  confidentialWatermark: 'Confidential • PropEZ',
  signerBadge: 'Assinado com Rubrica · Powered by Taggo',
  creditLine: 'Assinado com Rubrica · Powered by Taggo',
  termsLabel: 'Termos de Uso da PropEZ',
  legalFooter: (documentId: string) =>
    `PropEZ ${documentId}. Contrato assinado eletronicamente na plataforma PropEZ. Assinado com Rubrica · Powered by Taggo. Conforme MP 2.200-2/2001, Lei 14.063/2020 e controles de segurança alinhados à LGPD.`,
  logFooter: (documentId: string) =>
    `Este log é exclusivo e parte integrante do documento número ${documentId}, segundo os Termos de Uso da PropEZ.`,
  emailNotice:
    'Assinatura digital realizada com Rubrica · Powered by Taggo. Documento com validade jurídica conforme MP 2.200-2/2001 e Lei 14.063/2020.',
  emailSignedNotice:
    'Contrato assinado eletronicamente com Rubrica · Powered by Taggo. Segue em anexo o documento assinado por ambas as partes.',
  emailInviteNotice:
    'Assinatura digital via Rubrica · Powered by Taggo.',
} as const;

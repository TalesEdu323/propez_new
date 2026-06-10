/** Mensagem amigável para erros técnicos ao preparar assinatura/PDF. */
export function friendlySignaturePrepareError(message: string): string {
  if (/unknown image format|invalid image|images dictionary/i.test(message)) {
    return 'Não foi possível gerar o PDF do contrato. Tente novamente ou contate quem enviou a proposta.';
  }
  if (/sem_contrato/i.test(message)) {
    return 'Esta proposta não possui contrato configurado. Entre em contato com quem enviou a proposta.';
  }
  if (/sem_email/i.test(message)) {
    return 'É necessário informar um e-mail válido para gerar a assinatura.';
  }
  if (/sem_passo_sign/i.test(message)) {
    return 'Esta proposta não inclui etapa de assinatura.';
  }
  return message.length > 200 ? 'Não foi possível preparar a assinatura. Tente novamente.' : message;
}

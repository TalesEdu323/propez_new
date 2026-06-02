/** Mensagem amigável para erros técnicos ao preparar assinatura/PDF. */
export function friendlySignaturePrepareError(message: string): string {
  if (/unknown image format|invalid image|images dictionary/i.test(message)) {
    return 'Não foi possível gerar o PDF do contrato. Tente novamente ou contate quem enviou a proposta.';
  }
  if (/sem_contrato|sem_passo_sign|sem_email/i.test(message)) {
    return message;
  }
  return message.length > 200 ? 'Não foi possível preparar a assinatura. Tente novamente.' : message;
}

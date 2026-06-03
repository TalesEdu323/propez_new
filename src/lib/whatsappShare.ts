/** Normaliza telefone para wa.me (apenas dígitos; prefixo 55 para BR sem DDI). */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const text = message.trim();
  const base = `https://wa.me/${normalized}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function buildProposalWhatsAppMessage(proposalUrl: string): string {
  return `Olá! Segue o link da sua proposta: ${proposalUrl}`;
}

export function buildComprovanteWhatsAppMessage(opts?: { title?: string; valorLabel?: string }): string {
  const parts = ['Olá! Realizei o pagamento.'];
  if (opts?.title?.trim()) parts.push(`Referente a: ${opts.title.trim()}.`);
  if (opts?.valorLabel?.trim()) parts.push(`Valor: ${opts.valorLabel.trim()}.`);
  parts.push('Nos envie seu comprovante por aqui.');
  return parts.join(' ');
}

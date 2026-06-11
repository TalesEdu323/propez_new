const PREFIX = '[Propez:Contrato]';

export type ContratoDiagPayload = Record<string, unknown>;

export function resumirPdfPath(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (!path.startsWith('http')) return path;
  try {
    const u = new URL(path);
    const file = u.pathname.split('/').filter(Boolean).pop();
    return `${u.hostname}/.../${file ?? 'arquivo'}`;
  } catch {
    return 'url-invalida';
  }
}

function verboseAtivo(): boolean {
  try {
    return import.meta.env.DEV || localStorage.getItem('propez:contrato:debug') === '1';
  } catch {
    return Boolean(import.meta.env.DEV);
  }
}

/** Logs de etapa (só em dev ou com localStorage propez:contrato:debug = 1). */
export function logContratoInfo(etapa: string, detalhes?: ContratoDiagPayload): void {
  if (!verboseAtivo()) return;
  console.info(PREFIX, etapa, detalhes ?? {});
}

/** Sempre no console quando algo falha — use F12 → Console e filtre por "Propez:Contrato". */
export function logContratoErro(
  etapa: string,
  mensagem: string,
  detalhes?: ContratoDiagPayload,
): void {
  console.error(PREFIX, {
    etapa,
    mensagem,
    ...(detalhes ?? {}),
    dica:
      'Filtre o console por "Propez:Contrato". Para log de cada etapa: localStorage.setItem("propez:contrato:debug", "1") e recarregue.',
  });
}

export function logContratoAviso(
  etapa: string,
  mensagem: string,
  detalhes?: ContratoDiagPayload,
): void {
  console.warn(PREFIX, { etapa, mensagem, ...(detalhes ?? {}) });
}

export function extrairErro(err: unknown): ContratoDiagPayload {
  if (err instanceof Error) {
    const base: ContratoDiagPayload = {
      nome: err.name,
      mensagem: err.message,
    };
    if ('code' in err && typeof (err as { code: unknown }).code === 'string') {
      base.codigo = (err as { code: string }).code;
    }
    if ('status' in err && typeof (err as { status: unknown }).status === 'number') {
      base.httpStatus = (err as { status: number }).status;
    }
    return base;
  }
  return { valor: String(err) };
}

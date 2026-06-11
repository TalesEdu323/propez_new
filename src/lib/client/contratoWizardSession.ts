export type ContratoWizardStep = 'choose' | 'content' | 'signature';

export type ContratoWizardSession = {
  contratoId: string;
  wizardStep: ContratoWizardStep;
  sourceType: 'text' | 'pdf';
  ts: number;
};

const STORAGE_KEY = 'propez:contrato-wizard';
const TTL_MS = 30 * 60 * 1000;

export function saveContratoWizardSession(
  session: Pick<ContratoWizardSession, 'contratoId' | 'wizardStep' | 'sourceType'>,
): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, ts: Date.now() } satisfies ContratoWizardSession),
    );
  } catch {
    /* quota / private mode */
  }
}

export function loadContratoWizardSession(): ContratoWizardSession | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContratoWizardSession;
    if (!parsed?.contratoId || !parsed.wizardStep || !parsed.ts) return null;
    if (Date.now() - parsed.ts > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearContratoWizardSession(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

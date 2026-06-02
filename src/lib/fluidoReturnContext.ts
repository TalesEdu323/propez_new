const STORAGE_KEY = 'propez_fluido_return';

export interface FluidoReturnContext {
  modeloId: string;
  returnStep: number;
}

export function setFluidoReturnContext(ctx: FluidoReturnContext): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore quota / private mode */
  }
}

export function consumeFluidoReturnContext(): FluidoReturnContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw) as FluidoReturnContext;
    if (!parsed?.modeloId || typeof parsed.returnStep !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function peekFluidoReturnContext(): FluidoReturnContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FluidoReturnContext;
    if (!parsed?.modeloId || typeof parsed.returnStep !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

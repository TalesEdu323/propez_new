/** Serializa valor para parâmetro Postgres `$N::jsonb`. */
export function toJsonbParam(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch (err) {
    throw new Error(`JSON não serializável: ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

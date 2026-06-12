export class JsonNotSerializableError extends Error {
  readonly field: string;

  constructor(field: string, cause?: unknown) {
    const detail = cause instanceof Error ? cause.message : 'unknown';
    super(`JSON não serializável em "${field}": ${detail}`);
    this.name = 'JsonNotSerializableError';
    this.field = field;
  }
}

/** Falha cedo se o valor não puder virar JSON (referências circulares, BigInt, etc.). */
export function assertJsonSerializable(value: unknown, field: string): void {
  try {
    JSON.stringify(value ?? null);
  } catch (err) {
    throw new JsonNotSerializableError(field, err);
  }
}

/** Serializa valor para parâmetro Postgres `$N::jsonb`. */
export function toJsonbParam(value: unknown, field = 'payload'): string {
  assertJsonSerializable(value, field);
  return JSON.stringify(value ?? null);
}

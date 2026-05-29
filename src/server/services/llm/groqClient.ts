const GROQ_BASE = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export class GroqRateLimitError extends Error {
  readonly retryAfterSeconds: number | null;

  constructor(retryAfterSeconds: number | null) {
    super('Groq rate limit exceeded');
    this.name = 'GroqRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class GroqConfigError extends Error {
  constructor() {
    super('GROQ_API_KEY não configurada');
    this.name = 'GroqConfigError';
  }
}

export interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqChatParams {
  model?: string;
  messages: GroqChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

export interface GroqChatResult {
  content: string;
}

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new GroqConfigError();
  return key;
}

export async function groqChat(params: GroqChatParams): Promise<GroqChatResult> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model ?? DEFAULT_MODEL,
      messages: params.messages,
      temperature: params.temperature ?? 0.4,
      max_tokens: params.max_tokens ?? 4096,
      response_format: params.response_format,
    }),
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const parsed = retryAfter ? Number(retryAfter) : null;
    throw new GroqRateLimitError(Number.isFinite(parsed) ? parsed : null);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Resposta vazia do Groq');
  return { content };
}

export function parseJsonContent<T>(content: string): T {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const raw = jsonMatch ? jsonMatch[0] : trimmed;
  return JSON.parse(raw) as T;
}

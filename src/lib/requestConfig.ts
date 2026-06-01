export type RequestFlowMode = 'native' | 'external';

export type ServiceRequestType = 'whitelabel' | 'enterprise';

export interface RequestFlowConfig {
  mode: RequestFlowMode;
  externalUrl: string | null;
}

export type RequestConfigMap = Record<ServiceRequestType, RequestFlowConfig>;

let cached: RequestConfigMap | null = null;

export async function fetchRequestConfig(): Promise<RequestConfigMap> {
  if (cached) return cached;
  const res = await fetch('/api/platform/request-config');
  if (!res.ok) throw new Error('Não foi possível carregar configuração de solicitações.');
  cached = (await res.json()) as RequestConfigMap;
  return cached;
}

export function invalidateRequestConfigCache(): void {
  cached = null;
}

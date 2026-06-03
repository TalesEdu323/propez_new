import { api } from './apiClient';

export async function loadUiPreference<T>(key: string): Promise<T | null> {
  try {
    const data = await api.get<{ key: string; value: T | null }>(
      `/api/me/preferences?key=${encodeURIComponent(key)}`,
    );
    return data.value ?? null;
  } catch {
    return null;
  }
}

export async function saveUiPreference(key: string, value: unknown): Promise<void> {
  await api.patch('/api/me/preferences', { key, value });
}

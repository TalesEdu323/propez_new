import { useCallback, useEffect, useState } from 'react';
import { api } from './apiClient';
import type { AppRoute, NavigateFn } from '../types/navigation';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  readAt: string | null;
  date: string;
}

interface NotificationsResponse {
  unreadCount: number;
  items: AppNotification[];
}

export function openNotificationAction(url: string, navigate: NavigateFn): void {
  try {
    const u = new URL(url, window.location.origin);
    const route = u.searchParams.get('route');
    const id = u.searchParams.get('id');
    if (route) {
      navigate(route as AppRoute, id ? { id } : {});
      return;
    }
  } catch {
    /* ignore */
  }
  window.location.href = url;
}

export function useNotifications(enabled = true) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const data = await api.get<NotificationsResponse>('/api/notifications');
      setItems(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      console.error('[notifications] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`, {});
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('[notifications] markRead failed:', err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/api/notifications/read-all', {});
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[notifications] markAllRead failed:', err);
    }
  }, []);

  return { items, unreadCount, loading, refresh, markRead, markAllRead };
}

export function notificationTone(type: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (type.includes('approved') || type.includes('signed') || type.includes('paid')) return 'success';
  if (type.includes('rejected')) return 'danger';
  if (type.includes('sent') || type.includes('viewed')) return 'warning';
  return 'neutral';
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Unlink,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { api, ApiError } from '../../lib/apiClient';

type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink?: string | null;
  location?: string | null;
};

type CalendarStatus = {
  connected: boolean;
  googleEmail: string | null;
  source: string | null;
};

export function GoogleCalendarPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cursorMonth, setCursorMonth] = useState(() => new Date());
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const monthRange = useMemo(() => {
    const start = startOfMonth(cursorMonth);
    const end = endOfMonth(cursorMonth);
    return {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    };
  }, [cursorMonth]);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const data = await api.get<CalendarStatus>('/api/integrations/google-calendar/status');
      setStatus(data);
      return data;
    } catch {
      const fallback = { connected: false, googleEmail: null, source: null };
      setStatus(fallback);
      return fallback;
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const params = new URLSearchParams({
        timeMin: monthRange.timeMin,
        timeMax: monthRange.timeMax,
      });
      const data = await api.get<{ events: CalendarEvent[] }>(
        `/api/integrations/google-calendar/events?${params.toString()}`,
      );
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setEvents([]);
        setStatus((s) => (s ? { ...s, connected: false } : s));
        return;
      }
      setEvents([]);
      setBanner({ type: 'error', text: 'Erro ao carregar eventos da agenda.' });
    } finally {
      setLoadingEvents(false);
    }
  }, [monthRange.timeMin, monthRange.timeMax]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected === '1') {
      setBanner({ type: 'success', text: 'Google Agenda conectada com sucesso.' });
      searchParams.delete('connected');
      setSearchParams(searchParams, { replace: true });
      void loadStatus().then((s) => {
        if (s?.connected) void loadEvents();
      });
    } else if (error) {
      setBanner({ type: 'error', text: 'Não foi possível conectar a Google Agenda.' });
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, loadStatus, loadEvents]);

  useEffect(() => {
    if (status?.connected) {
      void loadEvents();
    }
  }, [status?.connected, loadEvents]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = format(new Date(ev.start), 'yyyy-MM-dd');
      const arr = map.get(key) || [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursorMonth), { locale: ptBR });
    const end = endOfWeek(endOfMonth(cursorMonth), { locale: ptBR });
    const out: Date[] = [];
    let d = start;
    while (d <= end) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [cursorMonth]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, 'yyyy-MM-dd');
    return eventsByDay.get(key) || [];
  }, [selectedDay, eventsByDay]);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await api.delete('/api/integrations/google-calendar/disconnect');
      setStatus({ connected: false, googleEmail: null, source: null });
      setEvents([]);
      setSelectedDay(null);
      setBanner({ type: 'success', text: 'Agenda desconectada.' });
    } catch {
      setBanner({ type: 'error', text: 'Erro ao desconectar agenda.' });
    } finally {
      setDisconnecting(false);
    }
  }

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="max-w-lg mx-auto">
        {banner && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              banner.type === 'success'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {banner.text}
          </div>
        )}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <CalendarIcon className="h-10 w-10 mx-auto text-zinc-900 mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-zinc-900">Conectar Google Agenda</h2>
          <p className="text-zinc-500 text-sm mb-6">
            Visualize seus compromissos do Google Calendar no PropEZ. Você pode usar uma conta Google
            diferente do e-mail de login.
          </p>
          <a
            href="/api/integrations/google-calendar/connect"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors"
          >
            Conectar Google Agenda
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {banner && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            banner.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Agenda</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Conta Google: <span className="font-medium text-zinc-900">{status.googleEmail}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/integrations/google-calendar/connect"
            className="inline-flex items-center px-4 py-2 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Usar outra conta
          </a>
          <button
            type="button"
            onClick={() => void handleDisconnect()}
            disabled={disconnecting}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {disconnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unlink className="h-4 w-4" />
            )}
            Desconectar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={() => setCursorMonth((m) => subMonths(m, 1))}
            className="p-2 rounded-xl hover:bg-zinc-50 text-zinc-600"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold capitalize text-zinc-900">
              {format(cursorMonth, 'MMMM yyyy', { locale: ptBR })}
            </p>
            {loadingEvents && (
              <p className="text-xs text-zinc-400 flex items-center justify-center gap-1 mt-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Atualizando…
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCursorMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-xl hover:bg-zinc-50 text-zinc-600"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-zinc-400 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(key) || [];
            const inMonth = isSameMonth(day, cursorMonth);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`min-h-[72px] sm:min-h-[80px] rounded-lg border p-1 text-left transition-colors ${
                  inMonth ? 'bg-white' : 'bg-zinc-50 text-zinc-400'
                } ${isSelected ? 'ring-2 ring-zinc-900 border-zinc-900' : 'border-zinc-100'} ${
                  isToday && !isSelected ? 'border-zinc-300' : ''
                }`}
              >
                <span
                  className={`text-xs font-medium ${isToday ? 'text-zinc-900 font-semibold' : ''}`}
                >
                  {format(day, 'd')}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className="truncate rounded px-1 py-0.5 text-[10px] bg-zinc-100 text-zinc-700"
                      title={ev.summary}
                    >
                      {ev.summary}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <p className="text-[10px] text-zinc-400">+{dayEvents.length - 2}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold capitalize text-zinc-900">
              {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-sm text-zinc-500 hover:text-zinc-900"
            >
              Fechar
            </button>
          </div>
          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum evento neste dia.</p>
          ) : (
            <ul className="space-y-3">
              {selectedDayEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate text-zinc-900">{ev.summary}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {ev.allDay
                        ? 'Dia inteiro'
                        : `${format(new Date(ev.start), 'HH:mm')} – ${format(new Date(ev.end), 'HH:mm')}`}
                    </p>
                    {ev.location && (
                      <p className="text-xs text-zinc-500 truncate">{ev.location}</p>
                    )}
                  </div>
                  {ev.htmlLink && (
                    <a
                      href={ev.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-zinc-700 hover:opacity-80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

import type { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';

interface ApiErrorLocals {
  apiErrorBody?: unknown;
  apiErrorDetail?: { message?: string; stack?: string };
}

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  if (typeof obj.error === 'string') return obj.error.slice(0, 500);
  if (typeof obj.message === 'string') return obj.message.slice(0, 500);
  return null;
}

function buildErrorDetail(locals: ApiErrorLocals): Record<string, unknown> | null {
  const detail: Record<string, unknown> = {};
  if (locals.apiErrorDetail?.message) detail.message = locals.apiErrorDetail.message;
  if (locals.apiErrorDetail?.stack) detail.stack = locals.apiErrorDetail.stack.slice(0, 2000);
  if (locals.apiErrorBody && typeof locals.apiErrorBody === 'object') {
    detail.response = locals.apiErrorBody;
  }
  return Object.keys(detail).length > 0 ? detail : null;
}

export function captureUnhandledErrorDetail(
  error: unknown,
  res: Response,
): void {
  const locals = res.locals as ApiErrorLocals;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  locals.apiErrorDetail = { message, stack };
}

export function createApiErrorTrackingMiddleware(pool: Pool) {
  return function apiErrorTracking(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const locals = res.locals as ApiErrorLocals;
    const originalJson = res.json.bind(res);

    res.json = function json(body?: unknown) {
      if (res.statusCode >= 500) {
        locals.apiErrorBody = body;
      }
      return originalJson(body);
    };

    res.on('finish', () => {
      if (res.statusCode < 500) return;
      if (req.path.startsWith('/api/integrations')) return;

      const routePattern = req.route?.path
        ? `${req.baseUrl || ''}${req.route.path}`
        : req.path;
      const pattern = routePattern.slice(0, 200);
      const requestPath = (req.originalUrl || req.path).slice(0, 500);
      const errorMessage =
        extractErrorMessage(locals.apiErrorBody) ??
        locals.apiErrorDetail?.message?.slice(0, 500) ??
        null;
      const errorDetail = buildErrorDetail(locals);
      const durationMs = Date.now() - start;

      pool
        .query(
          `INSERT INTO api_error_stats (stat_date, route_pattern, status_code, error_count)
           VALUES (CURRENT_DATE, $1, $2, 1)
           ON CONFLICT (stat_date, route_pattern, status_code)
           DO UPDATE SET error_count = api_error_stats.error_count + 1`,
          [pattern, res.statusCode],
        )
        .catch(() => {});

      pool
        .query(
          `INSERT INTO api_error_logs
             (route_pattern, request_path, method, status_code, error_message, error_detail,
              user_id, organization_id, duration_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            pattern,
            requestPath,
            req.method,
            res.statusCode,
            errorMessage,
            errorDetail ? JSON.stringify(errorDetail) : null,
            req.auth?.userId ?? null,
            req.auth?.orgId ?? null,
            durationMs,
          ],
        )
        .catch(() => {});
    });

    next();
  };
}

export interface ApiErrorLogRow {
  id: string;
  routePattern: string;
  requestPath: string;
  method: string;
  statusCode: number;
  errorMessage: string | null;
  errorDetail: Record<string, unknown> | null;
  userId: string | null;
  organizationId: string | null;
  durationMs: number | null;
  createdAt: string;
}

export async function fetchApiErrorLogs(
  pool: Pool,
  routePattern: string,
  days: number,
  limit: number,
): Promise<ApiErrorLogRow[]> {
  const { rows } = await pool.query<{
    id: string;
    route_pattern: string;
    request_path: string;
    method: string;
    status_code: number;
    error_message: string | null;
    error_detail: Record<string, unknown> | null;
    user_id: string | null;
    organization_id: string | null;
    duration_ms: number | null;
    created_at: Date;
  }>(
    `SELECT id, route_pattern, request_path, method, status_code, error_message, error_detail,
            user_id, organization_id, duration_ms, created_at
     FROM api_error_logs
     WHERE route_pattern = $1
       AND created_at >= NOW() - ($2 || ' days')::interval
       AND status_code >= 500
     ORDER BY created_at DESC
     LIMIT $3`,
    [routePattern, String(days), limit],
  );

  return rows.map((r) => ({
    id: r.id,
    routePattern: r.route_pattern,
    requestPath: r.request_path,
    method: r.method,
    statusCode: r.status_code,
    errorMessage: r.error_message,
    errorDetail: r.error_detail,
    userId: r.user_id,
    organizationId: r.organization_id,
    durationMs: r.duration_ms,
    createdAt: r.created_at.toISOString(),
  }));
}

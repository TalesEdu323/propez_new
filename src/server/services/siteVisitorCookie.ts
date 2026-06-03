import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { EnvironmentConfig } from '../env.js';

export const VISITOR_COOKIE = 'propez_vid';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function ensureVisitorId(
  req: Request,
  res: Response,
  config: EnvironmentConfig,
): string {
  const existing = req.cookies?.[VISITOR_COOKIE];
  if (typeof existing === 'string' && existing.length > 0) {
    return existing;
  }
  const id = randomUUID();
  res.cookie(VISITOR_COOKIE, id, {
    maxAge: ONE_YEAR_MS,
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
  });
  return id;
}

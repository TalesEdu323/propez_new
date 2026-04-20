import type { NextFunction, Request, Response } from 'express'

interface Bucket {
  count: number
  resetAt: number
}

/**
 * Rate limit in-memory (token bucket simples por IP).
 * Para produção com múltiplas instâncias, trocar por Redis.
 */
export function createRateLimit(options: { windowMs: number; max: number; key?: (req: Request) => string } = {
  windowMs: 60_000,
  max: 60,
}) {
  const { windowMs, max } = options
  const keyFn = options.key ?? ((req: Request) => req.ip || req.socket.remoteAddress || 'anon')
  const buckets = new Map<string, Bucket>()

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const now = Date.now()
    const k = keyFn(req)
    let b = buckets.get(k)
    if (!b || b.resetAt < now) {
      b = { count: 0, resetAt: now + windowMs }
      buckets.set(k, b)
    }
    b.count++
    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - b.count)))
    res.setHeader('X-RateLimit-Reset', String(Math.floor(b.resetAt / 1000)))
    if (b.count > max) {
      res.status(429).json({ error: 'Too many requests' })
      return
    }
    next()
  }
}

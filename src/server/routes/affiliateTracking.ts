import express from 'express';
import type { Request, Response, Router } from 'express';
import type { Pool } from 'pg';
import type { EnvironmentConfig } from '../env.js';
import { findActiveAffiliateByCode, recordAffiliateEvent } from '../services/affiliateEvents.js';
import { findCouponByCode, isCouponValid } from '../services/stripeCoupons.js';

const AFFILIATE_COOKIE = 'propez_ref';
const AFFILIATE_COOKIE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export function createAffiliateRedirectRouter(deps: {
  pool: Pool;
  config: EnvironmentConfig;
}): Router {
  const { pool, config } = deps;
  const router = express.Router();

  router.get('/r/:code', async (req: Request, res: Response) => {
    const code = String(req.params.code ?? '').trim();
    if (!code) {
      return res.redirect(302, '/');
    }

    const affiliate = await findActiveAffiliateByCode(pool, code);
    if (affiliate) {
      const sessionId =
        (req.cookies?.propez_sid as string | undefined) ??
        `sid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      await recordAffiliateEvent(pool, {
        affiliateId: affiliate.id,
        eventType: 'click',
        sessionId,
        metadata: {
          path: req.path,
          referer: req.get('referer') ?? null,
        },
      });

      res.cookie(AFFILIATE_COOKIE, affiliate.code, {
        maxAge: AFFILIATE_COOKIE_MAX_AGE_MS,
        httpOnly: false,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        path: '/',
      });
      res.cookie('propez_sid', sessionId, {
        maxAge: AFFILIATE_COOKIE_MAX_AGE_MS,
        httpOnly: false,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        path: '/',
      });
    }

    const dest = typeof req.query.to === 'string' && req.query.to.startsWith('/')
      ? req.query.to
      : '/cadastro';
    return res.redirect(302, dest);
  });

  return router;
}

export function createAffiliateTrackingRouter(deps: { pool: Pool }): Router {
  const { pool } = deps;
  const router = express.Router();

  router.post('/affiliate/view', async (req: Request, res: Response) => {
    const { affiliateCode, sessionId, path: pagePath } = (req.body ?? {}) as {
      affiliateCode?: string;
      sessionId?: string;
      path?: string;
    };

    const code = (affiliateCode ?? req.cookies?.[AFFILIATE_COOKIE] ?? '').trim();
    if (!code) {
      return res.json({ ok: true, skipped: true });
    }

    const affiliate = await findActiveAffiliateByCode(pool, code);
    if (!affiliate) {
      return res.json({ ok: true, skipped: true });
    }

    await recordAffiliateEvent(pool, {
      affiliateId: affiliate.id,
      eventType: 'view',
      sessionId: sessionId ?? (req.cookies?.propez_sid as string | undefined) ?? null,
      metadata: { path: pagePath ?? null },
    });

    return res.json({ ok: true });
  });

  router.get('/affiliate/validate', async (req: Request, res: Response) => {
    const code = String(req.query.code ?? '').trim();
    const plan = typeof req.query.plan === 'string' ? req.query.plan : null;

    if (!code) {
      return res.status(400).json({ valid: false, error: 'Código obrigatório' });
    }

    const coupon = await findCouponByCode(pool, code);
    if (!coupon) {
      return res.json({ valid: false, error: 'Cupom não encontrado' });
    }

    const validation = isCouponValid(coupon, plan);
    if (!validation.valid) {
      return res.json({ valid: false, error: validation.reason });
    }

    let description = '';
    if (coupon.discount_type === 'percent') {
      description = `${coupon.discount_value}% de desconto`;
    } else if (coupon.discount_type === 'free_months') {
      description = `${coupon.discount_value} ${coupon.discount_value === 1 ? 'mês grátis' : 'meses grátis'}`;
    } else {
      description = `${coupon.discount_value} dias de trial`;
    }

    return res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      description,
    });
  });

  return router;
}

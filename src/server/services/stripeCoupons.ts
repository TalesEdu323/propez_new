import type Stripe from 'stripe';
import type { Pool } from 'pg';

export type DiscountType = 'percent' | 'free_months' | 'trial_days';
export type CouponDuration = 'once' | 'repeating' | 'forever';

export interface PromoCouponRow {
  id: string;
  code: string;
  name: string;
  discount_type: DiscountType;
  discount_value: number;
  duration: CouponDuration;
  duration_in_months: number | null;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: Date | null;
  applies_to_plans: string[] | null;
  stripe_coupon_id: string | null;
  stripe_promotion_code_id: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCouponInput {
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  duration?: CouponDuration;
  durationInMonths?: number | null;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
  appliesToPlans?: string[] | null;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function findCouponByCode(
  pool: Pool,
  code: string,
): Promise<PromoCouponRow | null> {
  const { rows } = await pool.query<PromoCouponRow>(
    `SELECT * FROM promo_coupons WHERE LOWER(code) = LOWER($1) LIMIT 1`,
    [code.trim()],
  );
  return rows[0] ?? null;
}

export async function findCouponById(
  pool: Pool,
  id: string,
): Promise<PromoCouponRow | null> {
  const { rows } = await pool.query<PromoCouponRow>(
    `SELECT * FROM promo_coupons WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export function isCouponValid(
  coupon: PromoCouponRow,
  plan?: string | null,
): { valid: boolean; reason?: string } {
  if (coupon.status !== 'active') {
    return { valid: false, reason: 'Cupom inativo' };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, reason: 'Cupom expirado' };
  }
  if (
    coupon.max_redemptions != null &&
    coupon.redemption_count >= coupon.max_redemptions
  ) {
    return { valid: false, reason: 'Cupom esgotado' };
  }
  if (
    plan &&
    coupon.applies_to_plans &&
    coupon.applies_to_plans.length > 0 &&
    !coupon.applies_to_plans.includes(plan)
  ) {
    return { valid: false, reason: 'Cupom não válido para este plano' };
  }
  return { valid: true };
}

export async function createStripeCouponAndPromo(
  stripe: Stripe,
  pool: Pool,
  input: CreateCouponInput,
): Promise<PromoCouponRow> {
  const code = normalizeCode(input.code);
  const duration = input.duration ?? 'once';

  let stripeCouponId: string | null = null;
  let stripePromotionCodeId: string | null = null;

  if (input.discountType === 'percent' || input.discountType === 'free_months') {
    const couponParams: Stripe.CouponCreateParams = {
      name: input.name || code,
      currency: 'brl',
    };

    if (input.discountType === 'percent') {
      couponParams.percent_off = input.discountValue;
      couponParams.duration = duration;
      if (duration === 'repeating' && input.durationInMonths) {
        couponParams.duration_in_months = input.durationInMonths;
      }
    } else {
      couponParams.percent_off = 100;
      couponParams.duration = 'repeating';
      couponParams.duration_in_months = input.discountValue;
    }

    if (input.maxRedemptions) {
      couponParams.max_redemptions = input.maxRedemptions;
    }
    if (input.expiresAt) {
      couponParams.redeem_by = Math.floor(new Date(input.expiresAt).getTime() / 1000);
    }

    const stripeCoupon = await stripe.coupons.create(couponParams);
    stripeCouponId = stripeCoupon.id;

    const promoParams: Stripe.PromotionCodeCreateParams = {
      promotion: { type: 'coupon', coupon: stripeCoupon.id },
      code,
      active: true,
    };
    if (input.maxRedemptions) {
      promoParams.max_redemptions = input.maxRedemptions;
    }
    if (input.expiresAt) {
      promoParams.expires_at = Math.floor(new Date(input.expiresAt).getTime() / 1000);
    }

    const promo = await stripe.promotionCodes.create(promoParams);
    stripePromotionCodeId = promo.id;
  }

  const { rows } = await pool.query<PromoCouponRow>(
    `INSERT INTO promo_coupons (
       code, name, discount_type, discount_value, duration, duration_in_months,
       max_redemptions, expires_at, applies_to_plans, stripe_coupon_id, stripe_promotion_code_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      code,
      input.name || code,
      input.discountType,
      input.discountValue,
      input.discountType === 'free_months' ? 'repeating' : duration,
      input.discountType === 'free_months' ? input.discountValue : (input.durationInMonths ?? null),
      input.maxRedemptions ?? null,
      input.expiresAt ?? null,
      input.appliesToPlans ?? null,
      stripeCouponId,
      stripePromotionCodeId,
    ],
  );
  return rows[0];
}

export async function deactivateCoupon(
  stripe: Stripe,
  pool: Pool,
  id: string,
): Promise<PromoCouponRow | null> {
  const coupon = await findCouponById(pool, id);
  if (!coupon) return null;

  if (coupon.stripe_promotion_code_id) {
    try {
      await stripe.promotionCodes.update(coupon.stripe_promotion_code_id, { active: false });
    } catch (err) {
      console.error('[stripeCoupons] deactivate promotion code falhou:', err);
    }
  }

  const { rows } = await pool.query<PromoCouponRow>(
    `UPDATE promo_coupons SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0] ?? null;
}

export async function incrementCouponRedemption(
  pool: Pool,
  code: string,
): Promise<void> {
  await pool.query(
    `UPDATE promo_coupons
     SET redemption_count = redemption_count + 1, updated_at = NOW()
     WHERE LOWER(code) = LOWER($1)`,
    [code],
  );
}

export async function resolvePromotionCodeForCheckout(
  pool: Pool,
  stripe: Stripe,
  opts: {
    promotionCode?: string | null;
    couponCode?: string | null;
    plan?: string | null;
  },
): Promise<{
  stripePromotionCodeId: string | null;
  coupon: PromoCouponRow | null;
  trialDays: number | null;
}> {
  const code = (opts.promotionCode ?? opts.couponCode ?? '').trim();
  if (!code) {
    return { stripePromotionCodeId: null, coupon: null, trialDays: null };
  }

  const coupon = await findCouponByCode(pool, code);
  if (!coupon) {
    return { stripePromotionCodeId: null, coupon: null, trialDays: null };
  }

  const validation = isCouponValid(coupon, opts.plan);
  if (!validation.valid) {
    return { stripePromotionCodeId: null, coupon: null, trialDays: null };
  }

  if (coupon.discount_type === 'trial_days') {
    return { stripePromotionCodeId: null, coupon, trialDays: coupon.discount_value };
  }

  if (coupon.stripe_promotion_code_id) {
    return {
      stripePromotionCodeId: coupon.stripe_promotion_code_id,
      coupon,
      trialDays: null,
    };
  }

  // Fallback: buscar promotion code ativo no Stripe pelo código
  try {
    const list = await stripe.promotionCodes.list({ code: coupon.code, active: true, limit: 1 });
    const promo = list.data[0];
    if (promo) {
      await pool.query(
        `UPDATE promo_coupons SET stripe_promotion_code_id = $2, updated_at = NOW() WHERE id = $1`,
        [coupon.id, promo.id],
      );
      return { stripePromotionCodeId: promo.id, coupon, trialDays: null };
    }
  } catch (err) {
    console.error('[stripeCoupons] list promotion codes falhou:', err);
  }

  return { stripePromotionCodeId: null, coupon, trialDays: null };
}

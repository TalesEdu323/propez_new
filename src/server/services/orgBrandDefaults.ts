import type { Pool } from 'pg';
import { normalizeHexColor } from '../validation/brandColor.js';

export interface OrgBrandRow {
  whitelabel_enabled: boolean;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export interface OrgBrandDefaults {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  isWhiteLabel: boolean;
}

export async function fetchOrgBrand(pool: Pool, orgId: string): Promise<OrgBrandDefaults> {
  const { rows } = await pool.query<OrgBrandRow>(
    `SELECT whitelabel_enabled, logo_url, primary_color, secondary_color FROM organizations WHERE id = $1`,
    [orgId],
  );
  const row = rows[0];
  if (!row) {
    return { logoUrl: null, primaryColor: null, secondaryColor: null, isWhiteLabel: false };
  }
  const isWhiteLabel = row.whitelabel_enabled === true;
  return {
    logoUrl: row.logo_url,
    primaryColor: normalizeHexColor(row.primary_color),
    secondaryColor: normalizeHexColor(row.secondary_color),
    isWhiteLabel,
  };
}

export function mergePageLayoutWithOrgBrand(
  pageLayout: Record<string, unknown> | undefined,
  brand: OrgBrandDefaults,
): Record<string, unknown> {
  const base = pageLayout ?? { widthMode: 'boxed', horizontalPadding: 60 };
  if (!brand.isWhiteLabel) return base;

  const merged: Record<string, unknown> = { ...base };
  if (!merged.primaryColor && brand.primaryColor) {
    merged.primaryColor = brand.primaryColor;
  }
  if (!merged.secondaryColor && brand.secondaryColor) {
    merged.secondaryColor = brand.secondaryColor;
  }
  if (!merged.logoUrl && brand.logoUrl) {
    merged.logoUrl = brand.logoUrl;
  }
  return merged;
}

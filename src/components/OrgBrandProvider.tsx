import { useEffect } from 'react';
import { useSession } from '../lib/authSession';
import { applyOrgBrandCss, clearOrgBrandCss, resolveOrgBrand } from '../lib/orgBrand';

/**
 * Aplica CSS vars de whitelabel quando a org corrente é Business e tem cor primária.
 */
export function OrgBrandProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const org = session?.organization;
  const brand = resolveOrgBrand(org ?? null);

  useEffect(() => {
    if (brand.isWhiteLabel && brand.primaryColor) {
      applyOrgBrandCss(brand.primaryColor);
    } else {
      clearOrgBrandCss();
    }
    return () => clearOrgBrandCss();
  }, [brand.isWhiteLabel, brand.primaryColor, org?.id]);

  return <>{children}</>;
}

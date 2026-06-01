import { useState } from 'react';
import { PropezLogo } from './PropezLogo';
import { useSession } from '../lib/authSession';
import { resolveOrgBrand } from '../lib/orgBrand';

type BrandLogoProps = {
  height?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
};

const heightClass = {
  sm: 'h-10',
  md: 'h-12',
  lg: 'h-14',
  xl: 'h-[4.75rem]',
} as const;

const maxWidthClass = {
  sm: 'max-w-[170px]',
  md: 'max-w-[190px]',
  lg: 'max-w-[210px]',
  xl: 'max-w-[280px]',
} as const;

const iconSizeClass = {
  sm: 'w-10 h-10 text-lg',
  md: 'w-12 h-12 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-16 h-16 text-xl',
} as const;

/**
 * Logo da org quando whitelabel Business está ativo; senão marca Propez.
 */
export function BrandLogo({ height = 'md', showWordmark = false, className = '' }: BrandLogoProps) {
  const session = useSession();
  const brand = resolveOrgBrand(session?.organization ?? null);
  const [imgError, setImgError] = useState(false);

  if (!brand.isWhiteLabel || !brand.logoUrl) {
    return <PropezLogo height={height} showWordmark={showWordmark} className={className} />;
  }

  const initial = (brand.orgName || 'O').charAt(0).toUpperCase();

  if (imgError) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div
          className={`${iconSizeClass[height]} rounded-xl flex items-center justify-center font-bold shadow-sm shrink-0 text-white`}
          style={{ backgroundColor: brand.primaryColor ?? '#18181b' }}
        >
          {initial}
        </div>
        {showWordmark && brand.orgName && (
          <span className="font-semibold text-zinc-900 tracking-tight truncate">{brand.orgName}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={brand.logoUrl}
        alt={brand.orgName || 'Logo da empresa'}
        className={`${heightClass[height]} w-auto ${maxWidthClass[height]} object-contain shrink-0`}
        onError={() => setImgError(true)}
      />
      {showWordmark && brand.orgName && (
        <span className="font-semibold text-zinc-900 tracking-tight truncate">{brand.orgName}</span>
      )}
    </div>
  );
}

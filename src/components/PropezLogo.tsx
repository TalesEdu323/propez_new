import { useState } from 'react';

/** Logo horizontal/completa — login e menu. */
export const PROPEZ_LOGO_SRC = '/logo.svg';

type PropezLogoProps = {
  /** Altura da imagem (largura proporcional). */
  height?: 'sm' | 'md' | 'lg' | 'xl';
  /** Exibe o texto "Propez" ao lado (útil se o PNG for só o ícone). */
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
 * Marca do produto Propez. Arquivos: `public/logo.svg` e `public/icone.svg`.
 */
export function PropezLogo({ height = 'md', showWordmark = false, className = '' }: PropezLogoProps) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div
          className={`${iconSizeClass[height]} bg-zinc-900 rounded-xl flex items-center justify-center text-white font-bold shadow-sm shrink-0`}
        >
          P
        </div>
        {showWordmark && (
          <span className="font-semibold text-zinc-900 tracking-tight">Propez</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={PROPEZ_LOGO_SRC}
        alt="Propez"
        className={`${heightClass[height]} w-auto ${maxWidthClass[height]} object-contain shrink-0`}
        onError={() => setImgError(true)}
      />
      {showWordmark && (
        <span className="font-semibold text-zinc-900 tracking-tight">Propez</span>
      )}
    </div>
  );
}

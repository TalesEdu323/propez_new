interface PublicOrgHeaderProps {
  name: string;
  logoUrl: string | null;
  primaryColor?: string | null;
}

/**
 * Barra discreta no topo de propostas públicas (plano Business / whitelabel).
 */
export function PublicOrgHeader({ name, logoUrl, primaryColor }: PublicOrgHeaderProps) {
  const accent = primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#18181b';
  const initial = (name || 'O').charAt(0).toUpperCase();

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-black/[0.06] bg-white/90 backdrop-blur-md"
      style={{ borderBottomColor: `${accent}18` }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="h-8 w-auto max-w-[140px] object-contain shrink-0"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: accent }}
          >
            {initial}
          </div>
        )}
        <span className="text-sm font-semibold text-zinc-800 truncate">{name}</span>
      </div>
    </header>
  );
}

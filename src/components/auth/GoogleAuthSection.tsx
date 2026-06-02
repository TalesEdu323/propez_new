import { GoogleIcon } from './GoogleIcon';

type GoogleAuthSectionProps = {
  /** Texto do botão, ex.: "Entrar com Google" ou "Continuar com Google" */
  label: string;
  /** Para onde ir após OAuth (path relativo, ex. /app) */
  redirect?: string;
  className?: string;
};

/**
 * Separador + link para OAuth Google (`GET /api/auth/google`).
 */
export function GoogleAuthSection({ label, redirect = '/app', className }: GoogleAuthSectionProps) {
  const href =
    redirect && redirect.startsWith('/')
      ? `/api/auth/google?redirect=${encodeURIComponent(redirect)}`
      : '/api/auth/google';

  return (
    <div className={className}>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-100" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
          <span className="bg-white px-3 text-zinc-400 font-bold">ou</span>
        </div>
      </div>
      <a
        href={href}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
      >
        <GoogleIcon className="w-5 h-5 shrink-0" />
        {label}
      </a>
    </div>
  );
}

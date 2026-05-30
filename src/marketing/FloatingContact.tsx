import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { WHATSAPP_URL } from './constants';

const HIDDEN_PREFIXES = ['/login', '/cadastro', '/app', '/p/'];

export function FloatingContact() {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
      aria-label="WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  );
}

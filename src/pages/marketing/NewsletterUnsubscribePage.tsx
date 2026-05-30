import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MarketingLayout } from '../../marketing/MarketingLayout';
import { PageMeta } from '../../marketing/PageMeta';

export default function NewsletterUnsubscribePage() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading');

  useEffect(() => {
    if (!email) {
      setStatus('err');
      return;
    }
    fetch(`/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`)
      .then((r) => setStatus(r.ok ? 'ok' : 'err'))
      .catch(() => setStatus('err'));
  }, [email]);

  return (
    <MarketingLayout>
      <PageMeta title="Cancelar inscrição" path="/newsletter/unsubscribe" />
      <div className="container mx-auto px-4 py-24 max-w-md text-center">
        {status === 'loading' && <p className="text-zinc-500">Processando...</p>}
        {status === 'ok' && (
          <>
            <h1 className="text-2xl font-bold mb-4">Inscrição cancelada</h1>
            <p className="text-zinc-500 text-sm">O email {email} foi removido da nossa newsletter.</p>
          </>
        )}
        {status === 'err' && (
          <p className="text-red-600 text-sm">Não foi possível cancelar. Verifique o link do email.</p>
        )}
      </div>
    </MarketingLayout>
  );
}

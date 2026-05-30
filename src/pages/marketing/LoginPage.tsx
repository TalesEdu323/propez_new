import { useSearchParams } from 'react-router-dom';
import { AuthForm } from '../../components/auth/AuthForm';
import { PageMeta } from '../../marketing/PageMeta';

export default function LoginPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || params.get('reset') || null;

  return (
    <>
      <PageMeta title="Entrar" description="Acesse sua conta Propez." path="/login" />
      <AuthForm resetToken={token} initialMode="login" />
    </>
  );
}

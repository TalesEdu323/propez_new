import { AuthForm } from '../../components/auth/AuthForm';
import { PageMeta } from '../../marketing/PageMeta';

export default function CadastroPage() {
  return (
    <>
      <PageMeta title="Criar conta" description="Comece grátis no Propez." path="/cadastro" />
      <AuthForm initialMode="register" />
    </>
  );
}

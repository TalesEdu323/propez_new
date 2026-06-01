import { Link } from 'react-router-dom';
import { APP_BASE_PATH } from '../lib/appPaths';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-white text-zinc-700">
      <h1 className="text-2xl font-semibold text-zinc-900">Página não encontrada</h1>
      <p className="text-sm text-zinc-500">O endereço que você acessou não existe.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link to="/" className="btn-primary px-5 py-2.5 text-sm font-semibold">
          Ir para início
        </Link>
        <Link to={APP_BASE_PATH} className="btn-secondary px-5 py-2.5 text-sm font-semibold">
          Abrir app
        </Link>
      </div>
    </div>
  );
}

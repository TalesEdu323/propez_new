import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_BASE_PATH } from '../lib/appPaths';
import { isChunkLoadError, reloadOnceOnChunkError, clearChunkReloadFlag } from '../lib/chunkLoadError';

type Props = {
  children: ReactNode;
  /** Muda quando a URL muda — reseta o boundary para não prender o usuário na tela de erro. */
  resetKey?: string;
};

type State = { error: Error | null };

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[RouteErrorBoundary]', error, info.componentStack);
    if (isChunkLoadError(error)) {
      reloadOnceOnChunkError();
    }
  }

  private handleRetry = (): void => {
    const { error } = this.state;
    if (error && isChunkLoadError(error)) {
      clearChunkReloadFlag();
      reloadOnceOnChunkError();
      return;
    }
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const chunkStale = isChunkLoadError(this.state.error);
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-[#F5F5F7] text-zinc-700">
          <h1 className="text-lg font-semibold text-zinc-900">Algo deu errado</h1>
          <p className="text-sm text-zinc-500 text-center max-w-md">
            {chunkStale
              ? 'Uma nova versão do app está disponível. Recarregue a página para continuar.'
              : 'Não foi possível carregar esta página. Tente novamente ou volte ao início.'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={this.handleRetry}
              className="btn-secondary px-5 py-2.5 text-sm font-semibold"
            >
              {chunkStale ? 'Recarregar página' : 'Tentar de novo'}
            </button>
            <Link to="/" className="btn-secondary px-5 py-2.5 text-sm font-semibold">
              Início
            </Link>
            <Link to={APP_BASE_PATH} className="btn-primary px-5 py-2.5 text-sm font-semibold">
              Abrir app
            </Link>
            <Link to="/login" className="btn-secondary px-5 py-2.5 text-sm font-semibold">
              Entrar
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Reseta o boundary ao mudar de rota — evita ficar preso na tela de erro após navegar. */
export function RouteErrorBoundaryOutlet({ children }: { children: ReactNode }) {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}${location.hash}`;
  return <RouteErrorBoundary resetKey={resetKey}>{children}</RouteErrorBoundary>;
}

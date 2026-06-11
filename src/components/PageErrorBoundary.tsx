import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkLoadError, reloadOnceOnChunkError } from '../lib/chunkLoadError';

type Props = {
  children: ReactNode;
  /** Identificador da página atual — reseta o boundary ao trocar de rota interna. */
  resetKey: string;
  onRetry?: () => void;
};

type State = { error: Error | null; autoRetried: boolean };

/**
 * Boundary local para conteúdo de página — falha em uma tela não derruba o app inteiro.
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null, autoRetried: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, autoRetried: false });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[PageErrorBoundary]', error, info.componentStack);
    if (isChunkLoadError(error)) {
      reloadOnceOnChunkError();
      return;
    }
    if (!this.state.autoRetried) {
      this.setState({ autoRetried: true, error: null });
    }
  }

  private handleRetry = (): void => {
    this.props.onRetry?.();
    this.setState({ error: null, autoRetried: false });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[40vh] text-zinc-600">
          <p className="text-sm text-center max-w-md">
            Não foi possível carregar esta seção. Tente novamente ou escolha outra área no menu.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="btn-secondary px-5 py-2.5 text-sm font-semibold"
          >
            Tentar de novo
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary apanhou um erro não tratado:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-konecta-bg flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-konecta-navy/5 text-konecta-navy flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-konecta-navy uppercase tracking-tight">
                Algo correu de forma inesperada
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                Ocorreu um erro temporário no carregamento desta secção. Os teus dados e publicações continuam seguros na rede Konecta.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-gray-50 rounded-xl text-left font-mono text-[11px] text-gray-600 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full bg-konecta-navy text-white hover:bg-konecta-gold hover:text-konecta-navy py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              Recarregar e Voltar ao Início
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

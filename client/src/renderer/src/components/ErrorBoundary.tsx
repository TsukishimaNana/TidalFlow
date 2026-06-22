import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { logger } from '../utils/logger'

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
    errorInfo: null,
    showDetails: false
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Render error caught by ErrorBoundary', error, errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  private reload = (): void => {
    window.location.reload();
  };

  private toggleDetails = (): void => {
    this.setState((state) => ({ showDetails: !state.showDetails }));
  };

  render(): ReactNode {
    const { children } = this.props;
    const { error, errorInfo, showDetails } = this.state;

    if (!error) {
      return children;
    }

    const details = [error.stack, errorInfo?.componentStack].filter(Boolean).join('\n\n');

    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-stone-50 px-4 py-8 text-stone-950">
        <section className="w-full max-w-lg rounded-xl border border-stone-200 bg-white p-5 shadow-xl shadow-stone-900/10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">TidalFlow</p>
          <h1 className="mt-2 text-xl font-semibold text-stone-950">Something went wrong</h1>
          {error.message && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{error.message}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={this.reload}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              Reload
            </button>
            {details && (
              <button
                type="button"
                onClick={this.toggleDetails}
                className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                aria-expanded={showDetails}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            )}
          </div>
          {showDetails && details && (
            <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-stone-900 p-3 text-xs leading-5 text-stone-100">
              {details}
            </pre>
          )}
        </section>
      </main>
    );
  }
}

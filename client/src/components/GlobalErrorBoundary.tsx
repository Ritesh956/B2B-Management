import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 text-center">
          <div className="rounded-4xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl max-w-md w-full">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 mb-6">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              We encountered an unexpected error. Don't worry, your data is safe. Try reloading the application.
            </p>
            {this.state.error && (
              <div className="mb-6 rounded-xl bg-slate-50 dark:bg-black/20 p-4 text-left overflow-auto max-h-32">
                <code className="text-xs text-red-500 dark:text-red-400">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
            <button
              onClick={() => window.location.href = '/'}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition"
            >
              <RefreshCcw className="h-4 w-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

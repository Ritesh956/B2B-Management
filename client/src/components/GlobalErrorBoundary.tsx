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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 16, textAlign: 'center' }}>
          <div className="card" style={{ maxWidth: 420, width: '100%', padding: 32 }}>
            <div style={{
              margin: '0 auto 24px', width: 64, height: 64, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(239,68,68,0.12)', color: '#f87171',
            }}>
              <AlertTriangle size={32} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Something went wrong</h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
              We encountered an unexpected error. Don't worry, your data is safe. Try reloading the application.
            </p>
            {this.state.error && (
              <div style={{
                marginBottom: 24, borderRadius: 10, background: 'var(--bg-surface)',
                padding: 14, textAlign: 'left', overflow: 'auto', maxHeight: 128,
              }}>
                <code style={{ fontSize: 11.5, color: '#f87171' }}>
                  {this.state.error.toString()}
                </code>
              </div>
            )}
            <button
              onClick={() => window.location.href = '/'}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              <RefreshCcw size={16} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

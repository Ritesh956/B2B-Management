import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
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
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-primary)' }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>Something went wrong.</h1>
          <p style={{ color: 'var(--text-secondary)' }}>We're sorry, an unexpected error occurred.</p>
          <button 
            className="btn-primary" 
            style={{ marginTop: 20 }}
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

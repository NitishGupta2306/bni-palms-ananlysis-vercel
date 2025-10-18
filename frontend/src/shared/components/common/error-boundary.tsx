import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Copy, Check } from 'lucide-react';
import { errorReporting, ErrorContext } from '../../services/error-reporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'global' | 'route' | 'component';
  context?: Omit<ErrorContext, 'level' | 'componentStack'>;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, copied: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId, copied: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Report error to error reporting service
    const context: ErrorContext = {
      level: this.props.level || 'component',
      componentStack: errorInfo.componentStack || undefined,
      ...this.props.context,
    };

    errorReporting.reportError(error, errorInfo, context);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      copied: false
    });
  };

  handleCopyError = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto p-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Something went wrong
              </h1>
              <p className="text-muted-foreground mb-2">
                {this.props.level === 'global'
                  ? 'The application encountered an unexpected error.'
                  : 'This section of the app encountered an error.'}
              </p>

              {this.state.errorId && (
                <div className="mb-4 p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Bug className="h-3 w-3" />
                    <code className="font-mono">{this.state.errorId}</code>
                    <button
                      onClick={this.handleCopyError}
                      className="ml-1 p-1 hover:bg-background rounded transition-colors"
                      title="Copy error details"
                    >
                      {this.state.copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Error ID for support
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>

                {this.props.level === 'global' && (
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
                  >
                    Reload Application
                  </button>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Error Details (Development Only)
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div className="bg-muted p-3 rounded">
                      <p className="text-xs font-semibold mb-1">Message:</p>
                      <p className="text-xs text-destructive">{this.state.error?.message}</p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <p className="text-xs font-semibold mb-1">Stack Trace:</p>
                      <pre className="text-xs overflow-auto max-h-40">
                        {this.state.error?.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo?.componentStack && (
                      <div className="bg-muted p-3 rounded">
                        <p className="text-xs font-semibold mb-1">Component Stack:</p>
                        <pre className="text-xs overflow-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
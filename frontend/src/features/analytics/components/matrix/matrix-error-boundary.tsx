import React from 'react';
import ErrorBoundary from '@/shared/components/common/ErrorBoundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MatrixFallbackProps {
  error: Error;
  resetError: () => void;
}

const MatrixFallback: React.FC<MatrixFallbackProps> = ({ error, resetError }) => (
  <div className="flex flex-col items-center justify-center p-8 border border-destructive/20 rounded-lg bg-destructive/5">
    <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
    <h3 className="text-lg font-semibold mb-2">Matrix Display Error</h3>
    <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
      Unable to render the referral matrix. This may be due to invalid data or a temporary issue.
    </p>
    <div className="flex gap-2">
      <Button onClick={resetError} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
      <Button variant="default" onClick={() => window.location.reload()}>
        Reload Page
      </Button>
    </div>
    {process.env.NODE_ENV === 'development' && (
      <details className="mt-4 p-4 bg-muted rounded text-xs max-w-2xl">
        <summary className="cursor-pointer font-medium">Error Details</summary>
        <pre className="mt-2 overflow-auto whitespace-pre-wrap">{error.stack}</pre>
      </details>
    )}
  </div>
);

interface MatrixErrorBoundaryProps {
  children: React.ReactNode;
}

export const MatrixErrorBoundary: React.FC<MatrixErrorBoundaryProps> = ({ children }) => {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    return <MatrixFallback error={error} resetError={() => setError(null)} />;
  }

  return (
    <ErrorBoundary level="component" onError={(err) => setError(err)}>
      {children}
    </ErrorBoundary>
  );
};

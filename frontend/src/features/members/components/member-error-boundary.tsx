import React from 'react';
import ErrorBoundary from '@/shared/components/common/ErrorBoundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MemberFallbackProps {
  error: Error;
  resetError: () => void;
}

const MemberFallback: React.FC<MemberFallbackProps> = ({ error, resetError }) => (
  <div className="p-6 border border-destructive/20 rounded-lg">
    <div className="flex items-start gap-4">
      <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
      <div className="flex-1">
        <h3 className="font-semibold mb-1">Member Data Error</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Unable to load member information. Please try refreshing.
        </p>
        <Button onClick={resetError} size="sm" variant="outline">
          <RefreshCw className="w-3 h-3 mr-2" />
          Retry
        </Button>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-3 bg-muted rounded text-xs">
            <summary className="cursor-pointer font-medium">Error Details</summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap">{error.stack}</pre>
          </details>
        )}
      </div>
    </div>
  </div>
);

interface MemberErrorBoundaryProps {
  children: React.ReactNode;
}

export const MemberErrorBoundary: React.FC<MemberErrorBoundaryProps> = ({ children }) => {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    return <MemberFallback error={error} resetError={() => setError(null)} />;
  }

  return (
    <ErrorBoundary level="component" onError={(err) => setError(err)}>
      {children}
    </ErrorBoundary>
  );
};

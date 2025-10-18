import React from 'react';
import ErrorBoundary from '@/shared/components/common/ErrorBoundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminFallbackProps {
  error: Error;
  resetError: () => void;
}

const AdminFallback: React.FC<AdminFallbackProps> = ({ error, resetError }) => (
  <div className="p-8">
    <div className="max-w-md mx-auto">
      <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-center mb-2">Admin Panel Error</h2>
      <p className="text-muted-foreground text-center mb-6">
        An error occurred in the admin dashboard. Your data is safe.
      </p>
      <div className="flex gap-3 justify-center">
        <Button onClick={resetError} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset
        </Button>
        <Button onClick={() => window.location.href = '/admin'}>
          Back to Admin Home
        </Button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6 p-4 bg-muted rounded text-xs">
          <summary className="cursor-pointer font-medium">Error Details</summary>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap">{error.stack}</pre>
        </details>
      )}
    </div>
  </div>
);

interface AdminErrorBoundaryProps {
  children: React.ReactNode;
}

export const AdminErrorBoundary: React.FC<AdminErrorBoundaryProps> = ({ children }) => {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    return <AdminFallback error={error} resetError={() => setError(null)} />;
  }

  return (
    <ErrorBoundary level="route" onError={(err) => setError(err)}>
      {children}
    </ErrorBoundary>
  );
};

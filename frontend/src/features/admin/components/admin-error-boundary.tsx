import React from 'react';
import ErrorBoundary from '@/shared/components/common/error-boundary';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminFallbackProps {
  error: Error;
  resetError: () => void;
}

const AdminFallback: React.FC<AdminFallbackProps> = ({ error, resetError }) => (
  <div className="p-8">
    <div className="max-w-md mx-auto">
      <div className="relative mb-4">
        <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
        <AlertTriangle className="absolute top-0 right-1/3 w-6 h-6 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold text-center mb-2">Admin Panel Error</h2>
      <p className="text-muted-foreground text-center mb-6">
        An error occurred in the admin dashboard. Your data is safe, and no changes were made.
      </p>
      <div className="flex flex-col gap-2">
        <Button onClick={resetError} variant="outline" className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset Panel
        </Button>
        <Button onClick={() => window.location.href = '/admin'} className="w-full">
          Back to Admin Home
        </Button>
        <Button
          onClick={() => window.location.href = '/'}
          variant="ghost"
          className="w-full"
        >
          Return to Dashboard
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4">
        If this issue persists, contact your system administrator.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6 p-4 bg-muted rounded text-xs">
          <summary className="cursor-pointer font-medium hover:text-foreground transition-colors">
            Error Details (Development Only)
          </summary>
          <div className="mt-2 space-y-2">
            <div>
              <p className="font-semibold">Message:</p>
              <p className="text-destructive">{error.message}</p>
            </div>
            <div>
              <p className="font-semibold">Stack:</p>
              <pre className="overflow-auto whitespace-pre-wrap max-h-40">{error.stack}</pre>
            </div>
          </div>
        </details>
      )}
    </div>
  </div>
);

interface AdminErrorBoundaryProps {
  children: React.ReactNode;
  action?: string;
}

export const AdminErrorBoundary: React.FC<AdminErrorBoundaryProps> = ({
  children,
  action,
}) => {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    return <AdminFallback error={error} resetError={() => setError(null)} />;
  }

  return (
    <ErrorBoundary
      level="route"
      onError={(err) => setError(err)}
      context={{ action: action || 'admin_operation' }}
    >
      {children}
    </ErrorBoundary>
  );
};

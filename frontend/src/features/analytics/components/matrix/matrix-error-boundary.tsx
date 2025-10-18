import React from 'react';
import ErrorBoundary from '@/shared/components/common/error-boundary';
import { AlertTriangle, RefreshCw, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MatrixFallbackProps {
  error: Error;
  resetError: () => void;
}

const MatrixFallback: React.FC<MatrixFallbackProps> = ({ error, resetError }) => (
  <div className="flex flex-col items-center justify-center p-8 border border-destructive/20 rounded-lg bg-destructive/5">
    <div className="relative mb-4">
      <Grid3x3 className="w-12 h-12 text-muted-foreground" />
      <AlertTriangle className="absolute -top-1 -right-1 w-5 h-5 text-destructive" />
    </div>
    <h3 className="text-xl font-semibold mb-2">Matrix Display Error</h3>
    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
      Unable to render the referral matrix. This may be due to invalid data, corrupted matrix, or a temporary issue.
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
    <p className="text-xs text-muted-foreground mt-4">
      If this persists, try selecting a different report or contact support.
    </p>
    {process.env.NODE_ENV === 'development' && (
      <details className="mt-4 p-4 bg-muted rounded text-xs max-w-2xl w-full">
        <summary className="cursor-pointer font-medium">Error Details</summary>
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
);

interface MatrixErrorBoundaryProps {
  children: React.ReactNode;
  chapterId?: string;
  reportId?: number;
  matrixType?: string;
}

export const MatrixErrorBoundary: React.FC<MatrixErrorBoundaryProps> = ({
  children,
  chapterId,
  reportId,
  matrixType,
}) => {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    return <MatrixFallback error={error} resetError={() => setError(null)} />;
  }

  return (
    <ErrorBoundary
      level="component"
      onError={(err) => setError(err)}
      context={{
        chapterId,
        reportId: reportId?.toString(),
        action: 'viewing_matrix',
        additionalData: { matrixType },
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

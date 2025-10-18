import React from 'react';
import ErrorBoundary from '@/shared/components/common/ErrorBoundary';
import { AlertTriangle, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MemberFallbackProps {
  error: Error;
  resetError: () => void;
}

const MemberFallback: React.FC<MemberFallbackProps> = ({ error, resetError }) => (
  <div className="p-6 border border-destructive/20 rounded-lg bg-destructive/5">
    <div className="flex items-start gap-4">
      <div className="relative flex-shrink-0">
        <Users className="w-8 h-8 text-muted-foreground" />
        <AlertTriangle className="absolute -top-1 -right-1 w-4 h-4 text-destructive" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold mb-1 text-lg">Member Data Error</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Unable to load member information. This could be due to a network issue or data problem.
        </p>
        <div className="flex gap-2">
          <Button onClick={resetError} size="sm" variant="outline">
            <RefreshCw className="w-3 h-3 mr-2" />
            Retry
          </Button>
          <Button
            onClick={() => window.history.back()}
            size="sm"
            variant="ghost"
          >
            Go Back
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-3 bg-muted rounded text-xs">
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
                <pre className="overflow-auto whitespace-pre-wrap max-h-32">{error.stack}</pre>
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  </div>
);

interface MemberErrorBoundaryProps {
  children: React.ReactNode;
  chapterId?: string;
  memberId?: number;
}

export const MemberErrorBoundary: React.FC<MemberErrorBoundaryProps> = ({
  children,
  chapterId,
  memberId,
}) => {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    return <MemberFallback error={error} resetError={() => setError(null)} />;
  }

  return (
    <ErrorBoundary
      level="component"
      onError={(err) => setError(err)}
      context={{
        chapterId,
        action: 'viewing_member',
        additionalData: { memberId },
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

import React from 'react';
import ErrorBoundary from '../../../shared/components/common/ErrorBoundary';
import { Home, AlertCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  chapterId?: string;
}

const ChapterErrorFallback = () => (
  <div className="p-8 text-center max-w-md mx-auto">
    <div className="relative mb-4">
      <Home className="mx-auto h-12 w-12 text-muted-foreground" />
      <AlertCircle className="absolute top-0 right-1/3 h-5 w-5 text-destructive" />
    </div>
    <h3 className="text-xl font-semibold mb-2">Chapter Data Error</h3>
    <p className="text-muted-foreground mb-6">
      Unable to load chapter information. This could be due to a network issue or data problem.
    </p>
    <div className="space-y-2">
      <button
        onClick={() => window.location.reload()}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Refresh Page
      </button>
      <button
        onClick={() => window.location.href = '/'}
        className="w-full px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
      >
        Return to Home
      </button>
    </div>
  </div>
);

const ChapterErrorBoundary: React.FC<Props> = ({ children, chapterId }) => {
  return (
    <ErrorBoundary
      level="component"
      fallback={<ChapterErrorFallback />}
      context={{ chapterId, action: 'viewing_chapter' }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ChapterErrorBoundary;
import React from 'react';
import ErrorBoundary from '../../../shared/components/common/ErrorBoundary';
import { Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

const ChapterErrorFallback = () => (
  <div className="p-6 text-center">
    <Home className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
    <h3 className="text-lg font-semibold mb-2">Chapter Data Error</h3>
    <p className="text-muted-foreground mb-4">
      Unable to load chapter information. Please try refreshing the page.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
    >
      Refresh Page
    </button>
  </div>
);

const ChapterErrorBoundary: React.FC<Props> = ({ children }) => {
  return (
    <ErrorBoundary
      level="component"
      fallback={<ChapterErrorFallback />}
      onError={(error, errorInfo) => {
        console.error('Chapter component error:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ChapterErrorBoundary;
import React from 'react';
import ErrorBoundary from '../../../shared/components/common/ErrorBoundary';
import { Upload } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

const FileUploadErrorFallback = () => (
  <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
    <h3 className="text-lg font-semibold mb-2">File Upload Error</h3>
    <p className="text-muted-foreground mb-4">
      There was an error with the file upload feature. Please try again.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
    >
      Refresh Upload
    </button>
  </div>
);

const FileUploadErrorBoundary: React.FC<Props> = ({ children }) => {
  return (
    <ErrorBoundary
      level="component"
      fallback={<FileUploadErrorFallback />}
      onError={(error, errorInfo) => {
        console.error('File upload component error:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default FileUploadErrorBoundary;
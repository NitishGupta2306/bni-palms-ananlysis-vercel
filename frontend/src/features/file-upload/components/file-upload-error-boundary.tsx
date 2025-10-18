import React from 'react';
import ErrorBoundary from '../../../shared/components/common/ErrorBoundary';
import { Upload, AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  chapterId?: string;
}

const FileUploadErrorFallback = () => (
  <div className="p-8 text-center border-2 border-dashed border-destructive/20 rounded-lg bg-destructive/5 max-w-md mx-auto">
    <div className="relative mb-4">
      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
      <AlertCircle className="absolute top-0 right-1/3 h-5 w-5 text-destructive" />
    </div>
    <h3 className="text-xl font-semibold mb-2">File Upload Error</h3>
    <p className="text-muted-foreground mb-6">
      There was an error with the file upload feature. This could be due to an invalid file format or a temporary issue.
    </p>
    <div className="space-y-2">
      <button
        onClick={() => window.location.reload()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
        Restart Upload
      </button>
      <p className="text-xs text-muted-foreground mt-4">
        Tip: Ensure your files are in the correct format (Excel, CSV) and not corrupted.
      </p>
    </div>
  </div>
);

const FileUploadErrorBoundary: React.FC<Props> = ({ children, chapterId }) => {
  return (
    <ErrorBoundary
      level="component"
      fallback={<FileUploadErrorFallback />}
      context={{ chapterId, action: 'uploading_files' }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default FileUploadErrorBoundary;
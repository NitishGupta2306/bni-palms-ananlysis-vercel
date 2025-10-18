import React from 'react';
import { Loader2, CheckCircle, AlertTriangle, ChevronLeft, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UploadResult } from '../../hooks/use-file-upload-state';

interface Step4ProcessingProps {
  isUploading: boolean;
  uploadProgress: number;
  uploadResult: UploadResult | null;
  onStartOver: () => void;
  onTryAgain: () => void;
}

export const Step4Processing: React.FC<Step4ProcessingProps> = ({
  isUploading,
  uploadProgress,
  uploadResult,
  onStartOver,
  onTryAgain,
}) => {
  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Loading State */}
      {isUploading && (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-6">
              <div className="p-4 rounded-full bg-primary/10">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>
              <div className="text-center space-y-2 max-w-md">
                <h3 className="text-2xl font-bold">Processing Upload</h3>
                <p className="text-muted-foreground">
                  {uploadProgress < 95
                    ? 'Uploading files to server...'
                    : 'Processing files and generating matrices...'}
                </p>
              </div>
              <div className="w-full max-w-md space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progress</span>
                  <span className="text-muted-foreground">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <Progress value={uploadProgress} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {!isUploading && uploadResult?.type === 'success' && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-6">
              <div className="p-4 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center space-y-2 max-w-md">
                <h3 className="text-2xl font-bold text-green-900 dark:text-green-100">
                  Upload Successful!
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  {uploadResult.message}
                </p>
              </div>
              <Alert className="max-w-md">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your report has been processed and matrices have been generated.
                  You can now view the report in the Reports tab.
                </AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onStartOver}>
                  Upload Another
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {!isUploading && uploadResult?.type === 'error' && (
        <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-6">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-16 w-16 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-center space-y-2 max-w-md">
                <h3 className="text-2xl font-bold text-red-900 dark:text-red-100">
                  Upload Failed
                </h3>
                <p className="text-red-700 dark:text-red-300">
                  {uploadResult.message}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onTryAgain}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button variant="default" onClick={onStartOver}>
                  Start Over
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

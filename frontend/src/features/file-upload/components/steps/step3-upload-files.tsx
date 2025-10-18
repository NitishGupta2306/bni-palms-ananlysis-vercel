import React from 'react';
import { CloudUpload, Info, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { UploadFile, UploadType } from '../../hooks/use-file-upload-state';
import { FileList } from '../file-list';

interface Step3UploadFilesProps {
  files: UploadFile[];
  uploadType: UploadType;
  isDragActive: boolean;
  getRootProps: () => any;
  getInputProps: () => any;
  onRemoveFile: (index: number) => void;
  onChangeFileType: (index: number, type: 'slip_audit' | 'member_names') => void;
  onClearFiles: () => void;
  onUpload: () => void;
  canProceed: boolean;
}

export const Step3UploadFiles: React.FC<Step3UploadFilesProps> = ({
  files,
  uploadType,
  isDragActive,
  getRootProps,
  getInputProps,
  onRemoveFile,
  onChangeFileType,
  onClearFiles,
  onUpload,
  canProceed,
}) => {
  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Drop Zone */}
          <div
            {...getRootProps()}
            className={cn(
              'p-8 text-center border-2 border-dashed rounded-lg cursor-pointer transition-all',
              isDragActive
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : 'border-border hover:border-primary/50 bg-muted/30'
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              <div
                className={cn(
                  'p-4 rounded-full transition-colors',
                  isDragActive ? 'bg-primary/20' : 'bg-primary/10'
                )}
              >
                <CloudUpload
                  className={cn(
                    'h-12 w-12',
                    isDragActive ? 'text-primary' : 'text-primary/80'
                  )}
                />
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {isDragActive ? 'Drop files here...' : 'Drop Files Here'}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Or click to browse and select files
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {uploadType === 'members_only' &&
                    'Upload member names file (.xls, .xlsx)'}
                  {uploadType === 'palms_only' &&
                    'Upload PALMS slip audit file (.xls, .xlsx)'}
                  {uploadType === 'both' &&
                    'Upload both PALMS and member names files (.xls, .xlsx)'}
                </p>
              </div>
              <Badge variant="secondary">Supported: .xls, .xlsx</Badge>
            </div>
          </div>

          {/* Selected Files */}
          <FileList
            files={files}
            uploadType={uploadType}
            onRemoveFile={onRemoveFile}
            onChangeFileType={onChangeFileType}
            onClearAll={onClearFiles}
          />

          {files.some((f) => f.extractedDate) && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Date auto-detected from filename and applied to Step 2.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onUpload} disabled={!canProceed} size="lg">
          Upload & Process
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

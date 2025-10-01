import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CloudUpload } from 'lucide-react';
import { ChapterMemberData } from '../../../../shared/services/ChapterDataLoader';
import FileUploadComponent from '../../../file-upload/components/file-upload-component';
import FileUploadErrorBoundary from '../../../file-upload/components/file-upload-error-boundary';

interface FileUploadTabProps {
  chapterData: ChapterMemberData;
  onUploadSuccess: () => void;
}

const FileUploadTab: React.FC<FileUploadTabProps> = ({
  chapterData,
  onUploadSuccess
}) => {
  return (
    <Card className="border-l-4 border-l-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudUpload className="h-5 w-5 text-primary" />
          Upload Chapter Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FileUploadErrorBoundary>
          <FileUploadComponent
            chapterId={chapterData.chapterId}
            chapterName={chapterData.chapterName}
            onUploadSuccess={onUploadSuccess}
          />
        </FileUploadErrorBoundary>
      </CardContent>
    </Card>
  );
};

export default FileUploadTab;

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CloudUpload, GitCompare } from 'lucide-react';
import { ChapterMemberData } from '../../../../shared/services/ChapterDataLoader';
import FileUploadComponent from '../../../file-upload/components/file-upload-component';
import FileUploadErrorBoundary from '../../../file-upload/components/file-upload-error-boundary';
import ComparisonTab from '../../../analytics/components/comparison-tab';

interface UploadCompareTabProps {
  chapterData: ChapterMemberData;
  onUploadSuccess: () => void;
  refreshKey: number;
}

const UploadCompareTab: React.FC<UploadCompareTabProps> = ({
  chapterData,
  onUploadSuccess,
  refreshKey
}) => {
  return (
    <div className="space-y-6">
      {/* Upload Section */}
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

      {/* Comparison Section */}
      <Card className="border-l-4 border-l-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            Period Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ComparisonTab
            chapterId={chapterData.chapterId}
            key={refreshKey}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadCompareTab;

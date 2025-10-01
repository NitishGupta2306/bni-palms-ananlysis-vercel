import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChapterMemberData } from '../../../../shared/services/ChapterDataLoader';
import MatrixTab from '../../../analytics/components/matrix-tab';

interface MatrixPreviewTabProps {
  chapterData: ChapterMemberData;
  onMemberSelect: (memberName: string) => void;
  refreshKey: number;
}

const MatrixPreviewTab: React.FC<MatrixPreviewTabProps> = ({
  chapterData,
  onMemberSelect,
  refreshKey
}) => {
  return (
    <Card className="border-l-4 border-l-primary/30">
      <CardContent className="pt-6">
        <MatrixTab
          chapterData={chapterData}
          key={refreshKey}
        />
      </CardContent>
    </Card>
  );
};

export default MatrixPreviewTab;

import React from 'react';
import { ChapterMemberData } from '../../../shared/services/ChapterDataLoader';
import ChapterDetailTabbed from './chapter-detail-tabbed';

interface ChapterDetailPageProps {
  chapterData: ChapterMemberData;
  onBackToChapters: () => void;
  onMemberSelect: (memberName: string) => void;
  onDataRefresh?: () => void;
}

const ChapterDetailPage: React.FC<ChapterDetailPageProps> = (props) => {
  return <ChapterDetailTabbed {...props} />;
};

export default ChapterDetailPage;
import React, { useMemo, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import ChapterCard from './chapter-card';
import ChapterErrorBoundary from './chapter-error-boundary';
import ChapterCardSkeleton from '@/components/skeletons/ChapterCardSkeleton';
import { ChapterMemberData, generateMockPerformanceMetrics } from '../../../shared/services/ChapterDataLoader';
import { useNavigationStats } from '../../../shared/contexts/NavigationContext';

interface ChapterDashboardProps {
  chapterData: ChapterMemberData[];
  isLoading: boolean;
  onChapterSelect: (chapterId: string, tab: 'info' | 'upload' | 'compare' | 'preview') => void;
  onChapterAdded?: () => void;
}

const ChapterDashboard: React.FC<ChapterDashboardProps> = ({
  chapterData,
  isLoading,
  onChapterSelect,
  onChapterAdded,
}) => {
  const { setStats } = useNavigationStats();

  const processedChapterData = useMemo(() => {
    return chapterData.map(chapter => ({
      ...chapter,
      performanceMetrics: chapter.performanceMetrics || generateMockPerformanceMetrics(chapter.members)
    })).sort((a, b) => a.chapterName.localeCompare(b.chapterName));
  }, [chapterData]);

  const dashboardStats = useMemo(() => {
    const totalMembers = processedChapterData.reduce((sum, chapter) => sum + chapter.memberCount, 0);
    const biggestChapter = processedChapterData.reduce((max, chapter) =>
      (!chapter.loadError && chapter.memberCount > max.memberCount) ? chapter : max
    , { chapterName: '', memberCount: 0 } as ChapterMemberData);

    return { totalMembers, biggestChapter };
  }, [processedChapterData]);

  // Update navigation stats
  useEffect(() => {
    setStats({
      totalMembers: dashboardStats.totalMembers,
      biggestChapter: {
        chapterName: dashboardStats.biggestChapter.chapterName,
        memberCount: dashboardStats.biggestChapter.memberCount
      }
    });
  }, [dashboardStats, setStats]);



  if (isLoading && chapterData.length === 0) {
    return (
      <div className="space-y-6 p-6">
        {/* Dashboard Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ChapterCardSkeleton key={i} />
          ))}
        </div>

        {/* Chapter Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChapterCardSkeleton key={`chapter-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ChapterErrorBoundary>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 sm:space-y-8 p-4 sm:p-6"
        data-testid="chapter-dashboard"
      >
      {/* Chapters List */}
      <div>
        {processedChapterData.length > 0 ? (
          <div className="flex flex-col gap-4">
            {processedChapterData.map((chapter) => (
              <ChapterCard
                key={chapter.chapterId}
                chapterData={chapter}
                onTabSelect={onChapterSelect}
                isLoading={isLoading}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No chapters found</h3>
              <p className="text-muted-foreground">
                Contact your administrator to add BNI chapters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
    </ChapterErrorBoundary>
  );
};

export default ChapterDashboard;
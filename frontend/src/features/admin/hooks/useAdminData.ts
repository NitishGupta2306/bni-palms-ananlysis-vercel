import { useState, useEffect, useCallback, useMemo } from 'react';
import { SystemStats } from '../types/admin.types';
import { ChapterMemberData } from '../../../shared/services/ChapterDataLoader';
import { useChapterData } from '../../../shared/hooks/useChapterData';

export const useAdminData = () => {
  const [selectedChapter, setSelectedChapter] = useState<ChapterMemberData | null>(null);

  // Use React Query cached data
  const { data: chapterData = [], isLoading, refetch } = useChapterData();

  // Update selected chapter when data loads
  useEffect(() => {
    if (chapterData.length > 0) {
      // If selected chapter no longer exists (deleted), clear selection
      if (selectedChapter && !chapterData.find((c: ChapterMemberData) => c.chapterId === selectedChapter.chapterId)) {
        setSelectedChapter(chapterData[0]);
      } else if (!selectedChapter) {
        setSelectedChapter(chapterData[0]);
      }
    }
  }, [chapterData, selectedChapter]);

  const handleDataRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleChapterSelect = useCallback((chapterId: string) => {
    const chapter = chapterData.find((c: ChapterMemberData) => c.chapterId === chapterId);
    setSelectedChapter(chapter || null);
  }, [chapterData]);

  const systemStats = useMemo((): SystemStats => ({
    totalChapters: chapterData.length,
    totalMembers: chapterData.reduce((sum: number, chapter: ChapterMemberData) => sum + chapter.members.length, 0),
    totalReports: chapterData.reduce((sum: number, chapter: ChapterMemberData) => sum + (chapter.monthlyReports?.length || 0), 0),
    lastUpdated: new Date().toLocaleDateString()
  }), [chapterData]);

  return {
    chapterData,
    selectedChapter,
    isLoading,
    systemStats,
    handleDataRefresh,
    handleChapterSelect,
  };
};

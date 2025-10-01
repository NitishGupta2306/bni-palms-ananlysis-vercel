import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadAllChapterData, ChapterMemberData } from '../services/ChapterDataLoader';

// Query key for chapter data - used for cache invalidation
export const CHAPTER_DATA_QUERY_KEY = ['chapters', 'dashboard'];

/**
 * Custom hook for fetching and caching chapter dashboard data
 *
 * Benefits:
 * - Automatic caching with React Query (data persists across navigations)
 * - Background refetching when data becomes stale
 * - Deduplication of concurrent requests
 * - Cache invalidation support for data updates
 *
 * @returns Query result with chapter data, loading state, and error handling
 */
export const useChapterData = () => {
  return useQuery({
    queryKey: CHAPTER_DATA_QUERY_KEY,
    queryFn: loadAllChapterData,
    // Cache for 15 minutes (longer than default 5 min due to Supabase latency)
    staleTime: 15 * 60 * 1000,
    // Keep unused data in cache for 30 minutes
    gcTime: 30 * 60 * 1000,
    // Don't refetch on window focus by default (data doesn't change that often)
    refetchOnWindowFocus: false,
    // Retry on failure (network issues with Supabase)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};

/**
 * Hook to manually invalidate chapter data cache
 * Use this after bulk uploads or data modifications
 *
 * @returns Function to invalidate the cache and trigger a refetch
 */
export const useInvalidateChapterData = () => {
  const queryClient = useQueryClient();

  return () => {
    // Invalidate and refetch chapter data
    return queryClient.invalidateQueries({
      queryKey: CHAPTER_DATA_QUERY_KEY,
    });
  };
};

/**
 * Hook to manually update chapter data cache
 * Use this for optimistic updates or immediate cache updates
 *
 * @returns Function to set new chapter data in the cache
 */
export const useSetChapterData = () => {
  const queryClient = useQueryClient();

  return (data: ChapterMemberData[]) => {
    queryClient.setQueryData(CHAPTER_DATA_QUERY_KEY, data);
  };
};

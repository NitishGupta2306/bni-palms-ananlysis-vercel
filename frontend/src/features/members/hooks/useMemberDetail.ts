import { useState, useEffect, useCallback } from 'react';
import { MemberAnalytics } from '../types/member.types';

interface UseMemberDetailProps {
  chapterId: string | number;
  memberName: string;
}

interface UseMemberDetailReturn {
  memberAnalytics: MemberAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refetchMemberAnalytics: () => Promise<void>;
}

export const useMemberDetail = ({
  chapterId,
  memberName,
}: UseMemberDetailProps): UseMemberDetailReturn => {
  const [memberAnalytics, setMemberAnalytics] = useState<MemberAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemberAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const encodedMemberName = encodeURIComponent(memberName);
      const response = await fetch(`/api/chapters/${chapterId}/members/${encodedMemberName}/analytics/`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setMemberAnalytics(data);

    } catch (error) {
      console.error('Failed to load member analytics:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [chapterId, memberName]);

  useEffect(() => {
    fetchMemberAnalytics();
  }, [fetchMemberAnalytics]);

  return {
    memberAnalytics,
    isLoading,
    error,
    refetchMemberAnalytics: fetchMemberAnalytics,
  };
};

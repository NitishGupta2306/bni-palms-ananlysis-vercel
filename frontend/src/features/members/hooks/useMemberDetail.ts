import { useState, useEffect, useCallback } from "react";
import { MemberAnalytics } from "../types/member.types";
import { apiClient } from "@/lib/apiClient";
import { reportError } from "@/shared/services/error-reporting";

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
  const [memberAnalytics, setMemberAnalytics] =
    useState<MemberAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemberAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const encodedMemberName = encodeURIComponent(memberName);
      const data = await apiClient.get<MemberAnalytics>(
        `/api/chapters/${chapterId}/members/${encodedMemberName}/analytics/`,
      );
      setMemberAnalytics(data);
    } catch (error) {
      reportError(error instanceof Error ? error : new Error("Failed to load member analytics"), {
        action: "fetchMemberAnalytics",
        chapterId: chapterId.toString(),
        additionalData: { memberName },
      });
      setError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
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

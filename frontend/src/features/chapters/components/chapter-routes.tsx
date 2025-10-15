import React, { useEffect, Suspense, lazy } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { ChapterMemberData } from "../../../shared/services/ChapterDataLoader";
import { useChapterData } from "../../../shared/hooks/useChapterData";
import { ProtectedRoute } from "../../../components/protected-route";
import LandingPage from "../../landing/pages/landing-page";

const ChapterDetailPage = lazy(() => import("./chapter-detail-page"));
const MemberDetails = lazy(
  () => import("../../members/components/member-details"),
);
const AdminDashboard = lazy(
  () => import("../../admin/components/admin-dashboard"),
);

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center space-y-4">
      <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
      <div>
        <p className="text-lg font-medium">Loading...</p>
        <p className="text-sm text-muted-foreground">Please wait</p>
      </div>
    </div>
  </div>
);

interface ChapterRoutesProps {
  selectedChapterId: string;
  onChapterSelect: (chapterId: string) => void;
  onChaptersLoad: (
    chapters: Array<{
      chapterId: string;
      chapterName: string;
      memberCount: number;
    }>,
  ) => void;
  showAdminLogin?: boolean;
  onAdminLoginClose?: () => void;
}

const ChapterRoutes: React.FC<ChapterRoutesProps> = ({
  selectedChapterId,
  onChapterSelect,
  onChaptersLoad,
  showAdminLogin,
  onAdminLoginClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Use React Query hook for cached data fetching
  const {
    data: chapterData = [],
    isLoading: isLoadingChapters,
    refetch,
  } = useChapterData();

  // Notify parent when chapter data loads
  useEffect(() => {
    if (chapterData.length > 0) {
      // Notify parent of loaded chapters
      onChaptersLoad(
        chapterData.map((c: ChapterMemberData) => ({
          chapterId: c.chapterId,
          chapterName: c.chapterName,
          memberCount: c.memberCount,
        })),
      );

      // Extract chapter ID from URL if present (e.g., /chapter/:chapterId)
      const urlMatch = location.pathname.match(/^\/chapter\/([^\/]+)/);
      const urlChapterId = urlMatch ? urlMatch[1] : null;

      // Priority: URL chapter ID > currently selected > first chapter
      if (
        urlChapterId &&
        chapterData.some((c) => c.chapterId === urlChapterId)
      ) {
        // URL has a valid chapter ID - use it
        if (selectedChapterId !== urlChapterId) {
          onChapterSelect(urlChapterId);
        }
      } else if (!selectedChapterId) {
        // No chapter selected and not on a chapter detail page - select first
        onChapterSelect(chapterData[0].chapterId);
      }
    }
  }, [
    chapterData,
    selectedChapterId,
    onChapterSelect,
    onChaptersLoad,
    location.pathname,
  ]);

  // Navigation handlers
  const handleMemberSelect = (chapterId: string, memberName: string) => {
    navigate(`/chapter/${chapterId}/members/${encodeURIComponent(memberName)}`);
  };

  const handleBackToChapters = () => {
    navigate("/");
  };

  const handleBackToMembers = (chapterId: string) => {
    navigate(`/chapter/${chapterId}`);
  };

  const handleDataRefresh = async () => {
    // Refetch chapter data from React Query cache
    await refetch();
  };

  return (
    <Routes>
      {/* Landing Page */}
      <Route
        path="/"
        element={
          <LandingPage
            showAdminLogin={showAdminLogin}
            onAdminLoginClose={onAdminLoginClose}
          />
        }
      />

      {/* Admin Dashboard - Protected */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute type="admin">
            <Suspense fallback={<LoadingFallback />}>
              <AdminDashboard />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Chapter Detail Page - Protected */}
      <Route
        path="/chapter/:chapterId"
        element={
          <ProtectedRoute type="chapter">
            <ChapterDetailRoute
              chapterData={chapterData}
              onBackToChapters={handleBackToChapters}
              onMemberSelect={handleMemberSelect}
              onDataRefresh={handleDataRefresh}
            />
          </ProtectedRoute>
        }
      />

      {/* Member Details - Protected */}
      <Route
        path="/chapter/:chapterId/members/:memberName"
        element={
          <ProtectedRoute type="chapter">
            <MemberDetailsRoute
              chapterData={chapterData}
              onBackToMembers={handleBackToMembers}
              onBackToChapters={handleBackToChapters}
              onDataRefresh={handleDataRefresh}
            />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

// Route component for Chapter Detail Page with 4 tabs
const ChapterDetailRoute: React.FC<{
  chapterData: ChapterMemberData[];
  onBackToChapters: () => void;
  onMemberSelect: (chapterId: string, memberName: string) => void;
  onDataRefresh: () => void;
}> = ({ chapterData, onBackToChapters, onMemberSelect, onDataRefresh }) => {
  const { chapterId } = useParams<{ chapterId: string }>();

  const selectedChapter = chapterData.find(
    (chapter) => chapter.chapterId === chapterId,
  );

  if (!selectedChapter) {
    return <div>Chapter not found</div>;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ChapterDetailPage
        chapterData={selectedChapter}
        onBackToChapters={onBackToChapters}
        onMemberSelect={(memberName: string) =>
          onMemberSelect(chapterId!, memberName)
        }
        onDataRefresh={onDataRefresh}
      />
    </Suspense>
  );
};

// Route component for Member Details
const MemberDetailsRoute: React.FC<{
  chapterData: ChapterMemberData[];
  onBackToMembers: (chapterId: string) => void;
  onBackToChapters: () => void;
  onDataRefresh: () => void;
}> = ({ chapterData, onBackToMembers, onBackToChapters, onDataRefresh }) => {
  const { chapterId, memberName } = useParams<{
    chapterId: string;
    memberName: string;
  }>();

  const selectedChapter = chapterData.find(
    (chapter) => chapter.chapterId === chapterId,
  );
  const decodedMemberName = memberName ? decodeURIComponent(memberName) : "";

  if (!selectedChapter || !decodedMemberName) {
    return <div>Chapter or member not found</div>;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <MemberDetails
        chapterData={selectedChapter}
        memberName={decodedMemberName}
        onBackToMembers={() => onBackToMembers(chapterId!)}
        onBackToChapters={onBackToChapters}
        onDataRefresh={onDataRefresh}
      />
    </Suspense>
  );
};

export default ChapterRoutes;

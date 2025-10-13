import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";

// Import components
import ChapterRoutes from "../features/chapters/components/chapter-routes";
import { SharedNavigation } from "../features/chapters/components/shared-navigation";
import {
  NavigationProvider,
  useNavigationStats,
} from "../shared/contexts/NavigationContext";
import { ThemeProvider } from "../shared/contexts/ThemeContext";
import ErrorBoundary from "../shared/components/common/ErrorBoundary";
import { ErrorToastProvider } from "../shared/components/common/ErrorToast";
import { useNetworkStatus } from "../shared/hooks/useNetworkStatus";
import { queryClient } from "../shared/lib/queryClient";
import SplashScreen from "../components/animations/SplashScreen";

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Show splash only once per session
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    return !hasSeenSplash;
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem("hasSeenSplash", "true");
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <ErrorBoundary
      level="global"
      onError={(error, errorInfo) => {
        console.error("Global error:", error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ErrorToastProvider>
            <NavigationProvider>
              <Router>
                <div className="min-h-screen bg-background text-foreground">
                  <ErrorBoundary level="route">
                    <AppContent />
                  </ErrorBoundary>
                </div>
              </Router>
            </NavigationProvider>
          </ErrorToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const location = useLocation();
  const { stats } = useNavigationStats();
  const [selectedChapterId, setSelectedChapterId] = React.useState<string>("");
  const [chapters, setChapters] = React.useState<
    Array<{ chapterId: string; chapterName: string; memberCount: number }>
  >([]);

  // Initialize network status monitoring
  useNetworkStatus();

  const isDashboardOrAdmin =
    location.pathname === "/" || location.pathname.startsWith("/admin");

  return (
    <div className="flex h-screen">
      {/* Main Content Area - Full Width */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {isDashboardOrAdmin && (
            <div className="sticky top-0 z-10 bg-background border-b px-4 sm:px-6 py-4">
              <SharedNavigation
                totalMembers={stats.totalMembers}
                biggestChapter={stats.biggestChapter}
                chapters={chapters}
                selectedChapterId={selectedChapterId}
                onChapterSelect={setSelectedChapterId}
              />
            </div>
          )}
          <Routes>
            <Route
              path="/*"
              element={
                <ChapterRoutes
                  selectedChapterId={selectedChapterId}
                  onChapterSelect={setSelectedChapterId}
                  onChaptersLoad={setChapters}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;

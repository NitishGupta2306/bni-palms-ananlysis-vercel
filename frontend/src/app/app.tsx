import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";

// Import components
import ChapterRoutes from "../features/chapters/components/chapter-routes";
import { SharedNavigation } from "../features/chapters/components/shared-navigation";
import {
  NavigationProvider,
  useNavigationStats,
} from "@/shared/contexts/navigation-context";
import { ThemeProvider } from "@/shared/contexts/theme-context";
import ErrorBoundary from "../shared/components/common/error-boundary";
import { ErrorToastProvider } from "../shared/components/common/error-toast";
import { useNetworkStatus } from "../shared/hooks/use-network-status";
import { queryClient } from "../shared/lib/query-client";
import SplashScreen from "../components/animations/splash-screen";
import { DownloadQueueProvider } from "../contexts/download-queue-context";
import { DownloadProgressPanel } from "../components/ui/download-progress";
import { Toaster } from "../components/ui/toaster";
import { AuthProvider } from "../contexts/auth-context";

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
            <AuthProvider>
              <DownloadQueueProvider>
                <NavigationProvider>
                  <Router>
                    <div className="min-h-screen bg-background text-foreground">
                      <ErrorBoundary level="route">
                        <AppContent />
                      </ErrorBoundary>
                      <DownloadProgressPanel />
                      <Toaster />
                    </div>
                  </Router>
                </NavigationProvider>
              </DownloadQueueProvider>
            </AuthProvider>
          </ErrorToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { stats } = useNavigationStats();
  const [selectedChapterId, setSelectedChapterId] = React.useState<string>("");
  const [chapters, setChapters] = React.useState<
    Array<{ chapterId: string; chapterName: string; memberCount: number }>
  >([]);
  const [showAdminLogin, setShowAdminLogin] = React.useState(false);

  // Initialize network status monitoring
  useNetworkStatus();

  // Show SharedNavigation on landing page and admin pages
  const showSharedNavigation =
    location.pathname === "/" || location.pathname.startsWith("/admin");

  const handleAdminLogin = () => {
    // If on landing page, the landing page will handle showing its modal
    // Otherwise, navigate to admin with a prompt
    if (location.pathname === "/") {
      setShowAdminLogin(true);
    } else {
      navigate("/admin/bulk");
    }
  };

  return (
    <div className="flex h-screen">
      {/* Main Content Area - Full Width */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {showSharedNavigation && (
            <div className="sticky top-0 z-10 bg-background border-b px-4 sm:px-6 py-4">
              <SharedNavigation
                totalMembers={stats.totalMembers}
                biggestChapter={stats.biggestChapter}
                chapters={chapters}
                selectedChapterId={selectedChapterId}
                onChapterSelect={setSelectedChapterId}
                onAdminLogin={handleAdminLogin}
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
                  showAdminLogin={showAdminLogin}
                  onAdminLoginClose={() => setShowAdminLogin(false)}
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

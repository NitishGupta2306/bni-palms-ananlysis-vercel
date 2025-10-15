import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, Users, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config/api";
import { ChapterLoginModal } from "../components/chapter-login-modal";
import { AdminLoginModal } from "../components/admin-login-modal";

interface Chapter {
  id: number;
  name: string;
  location: string;
  member_count: number;
}

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [showChapterLogin, setShowChapterLogin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chapters/`);
        if (response.ok) {
          const data = await response.json();
          // Transform the data to match our interface
          const transformedChapters = data.map((chapter: any) => ({
            id: chapter.id,
            name: chapter.name,
            location: chapter.location,
            member_count: chapter.total_members || 0,
          }));
          setChapters(transformedChapters);
        }
      } catch (error) {
        console.error("Failed to fetch chapters:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapters();
  }, []);

  const handleChapterClick = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setShowChapterLogin(true);
  };

  const handleChapterLoginSuccess = (chapterId: string) => {
    setShowChapterLogin(false);
    navigate(`/chapter/${chapterId}`);
  };

  const handleAdminLoginSuccess = () => {
    setShowAdminLogin(false);
    navigate("/admin");
  };

  const totalMembers = chapters.reduce(
    (sum, chapter) => sum + chapter.member_count,
    0,
  );
  const totalChapters = chapters.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">BNI PALMS Analytics</h1>
            </div>
            <Button
              onClick={() => setShowAdminLogin(true)}
              variant="outline"
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              Admin Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Welcome to BNI PALMS Analytics
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Access your chapter's performance data, reports, and analytics.
            Select your chapter below to get started.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Total Chapters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalChapters}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalMembers}</p>
            </CardContent>
          </Card>
        </div>

        {/* Chapters Grid */}
        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-6 text-center">
            Select Your Chapter
          </h3>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading chapters...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {chapters.map((chapter) => (
                <Card
                  key={chapter.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleChapterClick(chapter)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      {chapter.name}
                    </CardTitle>
                    <CardDescription>{chapter.location}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{chapter.member_count} members</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                      >
                        Enter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="text-center text-sm text-muted-foreground mt-12">
          <p className="flex items-center justify-center gap-2">
            <Lock className="h-4 w-4" />
            All chapters and data are password protected
          </p>
        </div>
      </main>

      {/* Login Modals */}
      {selectedChapter && (
        <ChapterLoginModal
          isOpen={showChapterLogin}
          onClose={() => setShowChapterLogin(false)}
          chapter={selectedChapter}
          onSuccess={handleChapterLoginSuccess}
        />
      )}

      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
};

export default LandingPage;

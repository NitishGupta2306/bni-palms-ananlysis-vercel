import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CloudUpload,
  GitCompare,
  ChevronDown,
  ChevronUp,
  History,
  Grid3X3,
  ArrowRight,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ChapterMemberData } from "@/shared/services/chapter-data-loader";
import PreviousDataTab from '../../reports/components/previous-data-tab';
import MatrixTab from '../../analytics/components/matrix-tab';
import ComparisonTab from '../../analytics/components/comparison-tab';
import FileUploadComponent from '../../file-upload/components/file-upload-component';
import FileUploadErrorBoundary from '../../file-upload/components/file-upload-error-boundary';

interface OptimizedChapterDashboardProps {
  chapterData: ChapterMemberData;
  onBackToChapters: () => void;
  onMemberSelect: (memberName: string) => void;
  onDataRefresh?: () => void;
}

const OptimizedChapterDashboard: React.FC<OptimizedChapterDashboardProps> = ({
  chapterData,
  onBackToChapters,
  onMemberSelect,
  onDataRefresh,
}) => {
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewsOpen, setPreviewsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setUploadSuccess(true);
    setRefreshKey(prev => prev + 1); // Trigger refresh in child components
    if (onDataRefresh) {
      onDataRefresh();
    }
    // Auto-scroll to comparison section after upload
    setTimeout(() => {
      document.getElementById('comparison-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Breadcrumb Navigation */}
      <div className="px-4 sm:px-6 py-4 bg-background border-b">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={onBackToChapters}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Home className="h-4 w-4" />
                Chapters
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {chapterData.chapterName}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Chapter Header */}
      <div className="px-4 sm:px-6 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {chapterData.chapterName}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {chapterData.memberCount} members • Loaded {chapterData.loadedAt.toLocaleDateString()}
        </p>
      </div>

      {/* Primary Workflow Section: Upload → Compare */}
      <div className="px-4 sm:px-6">
        <div className="space-y-6">
          {/* Upload Data */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg">
                    1
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CloudUpload className="h-5 w-5" />
                      Upload Data
                    </CardTitle>
                    <CardDescription>
                      Upload your monthly Excel files to get started
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FileUploadErrorBoundary>
                <FileUploadComponent
                  chapterId={chapterData.chapterId}
                  chapterName={chapterData.chapterName}
                  onUploadSuccess={handleUploadSuccess}
                />
              </FileUploadErrorBoundary>

              {uploadSuccess && (
                <div className="mt-4 p-4 bg-green-950/30 border border-green-900 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-400">Upload successful!</p>
                      <p className="text-xs text-muted-foreground">Ready to compare with previous months</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-900 hover:bg-green-950/50"
                      onClick={() => {
                        document.getElementById('comparison-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Compare Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compare Results */}
          <Card id="comparison-section" className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg">
                    2
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GitCompare className="h-5 w-5" />
                      Compare Results
                    </CardTitle>
                    <CardDescription>
                      Analyze performance across months
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ComparisonTab key={`comparison-${refreshKey}`} chapterId={chapterData.chapterId} />
            </CardContent>
          </Card>
        </div>

        {/* Workflow Indicator */}
        <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CloudUpload className="h-4 w-4" />
            <span>Upload your data</span>
            <ArrowRight className="h-4 w-4" />
            <GitCompare className="h-4 w-4" />
            <span>Compare performance</span>
            <ArrowRight className="h-4 w-4" />
            <span>Track improvements</span>
          </div>
        </div>
      </div>

      {/* Secondary Features: Collapsible Sections */}
      <div className="px-4 space-y-4 mt-8">
        <h2 className="text-lg font-semibold text-muted-foreground">Additional Tools</h2>

        {/* Matrix Previews Section */}
        <Collapsible open={previewsOpen} onOpenChange={setPreviewsOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Grid3X3 className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <CardTitle className="text-base">Matrix Previews</CardTitle>
                      <CardDescription className="text-sm">
                        Preview referral, one-to-one, and combination matrices
                      </CardDescription>
                    </div>
                  </div>
                  {previewsOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <MatrixTab key={`matrix-${refreshKey}`} chapterData={chapterData} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* History Section */}
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <CardTitle className="text-base">Historical Data</CardTitle>
                      <CardDescription className="text-sm">
                        View all previous monthly reports and data
                      </CardDescription>
                    </div>
                  </div>
                  {historyOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <PreviousDataTab key={`history-${refreshKey}`} chapterData={chapterData} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
};

export default OptimizedChapterDashboard;

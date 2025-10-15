import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Info,
  Upload,
  GitCompare,
  Grid3X3,
  Building2,
  FileSpreadsheet,
  PlusCircle,
  Users,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChapterMemberData } from "../../../shared/services/ChapterDataLoader";
import ChapterInfoTab from "./tabs/chapter-info-tab";
import FileUploadTab from "./tabs/file-upload-tab";
import ComparisonTab from "../../analytics/components/comparison-tab";
import MatrixPreviewTab from "./tabs/matrix-preview-tab";
import MultiMonthTab from "../../analytics/components/multi-month-tab";
import { useNavigationStats } from "../../../shared/contexts/NavigationContext";

interface UnifiedDashboardProps {
  chapterData: ChapterMemberData[];
  isLoading: boolean;
  selectedChapterId: string;
  onChapterSelect: (chapterId: string) => void;
  onMemberSelect: (chapterId: string, memberName: string) => void;
  onDataRefresh?: () => void;
}

const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({
  chapterData,
  isLoading,
  selectedChapterId,
  onChapterSelect,
  onMemberSelect,
  onDataRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<
    "info" | "members" | "upload" | "compare" | "preview" | "multimonth"
  >("upload");
  const [refreshKey, setRefreshKey] = useState(0);
  const { setStats } = useNavigationStats();

  // Switch to upload tab when chapter changes
  useEffect(() => {
    setActiveTab("upload");
  }, [selectedChapterId]);

  // Update navigation stats
  useEffect(() => {
    const totalMembers = chapterData.reduce(
      (sum, chapter) => sum + chapter.memberCount,
      0,
    );
    const biggestChapter = chapterData.reduce(
      (max, chapter) =>
        !chapter.loadError && chapter.memberCount > max.memberCount
          ? chapter
          : max,
      { chapterName: "", memberCount: 0 } as ChapterMemberData,
    );

    setStats({
      totalMembers,
      biggestChapter: {
        chapterName: biggestChapter.chapterName,
        memberCount: biggestChapter.memberCount,
      },
    });
  }, [chapterData, setStats]);

  const selectedChapter = useMemo(() => {
    return chapterData.find((c) => c.chapterId === selectedChapterId);
  }, [chapterData, selectedChapterId]);

  const handleUploadSuccess = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    if (onDataRefresh) {
      onDataRefresh();
    }
    // Switch to preview tab after successful upload
    setTimeout(() => {
      setActiveTab("preview");
    }, 500);
  }, [onDataRefresh]);

  const tabs = useMemo(
    () => [
      // Action tabs (left side)
      { id: "upload" as const, label: "Upload", icon: Upload, group: "action" },
      {
        id: "compare" as const,
        label: "Compare",
        icon: GitCompare,
        group: "action",
      },
      {
        id: "preview" as const,
        label: "Single-Month",
        icon: Grid3X3,
        group: "action",
      },
      {
        id: "multimonth" as const,
        label: "Multi-Month",
        icon: Calendar,
        group: "action",
      },
      // Info tabs (right side)
      { id: "info" as const, label: "Chapter Info", icon: Info, group: "info" },
      { id: "members" as const, label: "Members", icon: Users, group: "info" },
    ],
    [],
  );

  if (isLoading && chapterData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-lg font-medium">Loading chapters...</p>
        </div>
      </div>
    );
  }

  if (chapterData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="max-w-4xl w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-3xl font-bold">Welcome to BNI Analytics</h2>
            <p className="text-muted-foreground text-lg">
              Get started by adding your chapters and members
            </p>
          </div>

          {/* Options */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Bulk Upload Option */}
            <Card className="border-2 hover:border-primary transition-colors cursor-pointer flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Bulk Upload</CardTitle>
                    <CardDescription>Fast and automated</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <div className="space-y-4 flex-1">
                  <p className="text-sm text-muted-foreground">
                    Upload a Regional PALMS Summary report to automatically
                    create chapters and add all members at once.
                  </p>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Creates multiple chapters</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Adds all members automatically</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Saves time on data entry</span>
                    </li>
                  </ul>
                </div>
                <Button
                  onClick={() => (window.location.href = "/admin/bulk")}
                  size="lg"
                  className="w-full mt-4"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Upload Regional PALMS Summary
                </Button>
              </CardContent>
            </Card>

            {/* Manual Add Option */}
            <Card className="border-2 hover:border-primary transition-colors cursor-pointer flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <PlusCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Manual Entry</CardTitle>
                    <CardDescription>Step by step</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <div className="space-y-4 flex-1">
                  <p className="text-sm text-muted-foreground">
                    Manually add chapters one at a time and configure their
                    settings individually.
                  </p>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Full control over chapter details</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Add chapters individually</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Perfect for small setups</span>
                    </li>
                  </ul>
                </div>
                <Button
                  onClick={() => (window.location.href = "/admin/chapters")}
                  size="lg"
                  variant="outline"
                  className="w-full mt-4"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Chapter Manually
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Tabs Bar */}
      <div className="sticky top-0 z-20 bg-background border-b shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const prevTab = index > 0 ? tabs[index - 1] : null;
              const showSeparator = prevTab && prevTab.group !== tab.group;

              return (
                <React.Fragment key={tab.id}>
                  {showSeparator && <div className="h-8 w-px bg-border mx-2" />}
                  <motion.button
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{tab.label}</span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-secondary/20 rounded-lg -z-10"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                  </motion.button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {selectedChapter && (
        <motion.div
          key={`${selectedChapterId}-${activeTab}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="p-4 sm:p-6"
        >
          {activeTab === "info" && (
            <ChapterInfoTab chapterData={selectedChapter} />
          )}
          {activeTab === "members" && (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Member Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedChapter.members.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-center text-muted-foreground py-8"
                      >
                        No members found in this chapter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedChapter.members.map((member, index) => {
                      const memberName =
                        typeof member === "string"
                          ? member
                          : (member as any).name || "Unknown";
                      return (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {memberName}
                          </TableCell>
                        </motion.tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
          {activeTab === "upload" && (
            <FileUploadTab
              chapterData={selectedChapter}
              onUploadSuccess={handleUploadSuccess}
            />
          )}
          {activeTab === "compare" && (
            <ComparisonTab
              chapterId={selectedChapter.chapterId}
              key={refreshKey}
            />
          )}
          {activeTab === "preview" && (
            <MatrixPreviewTab
              chapterData={selectedChapter}
              onMemberSelect={(memberName) =>
                onMemberSelect(selectedChapterId, memberName)
              }
              refreshKey={refreshKey}
            />
          )}
          {activeTab === "multimonth" && (
            <MultiMonthTab
              chapterId={selectedChapter.chapterId}
              chapterName={selectedChapter.chapterName}
            />
          )}
        </motion.div>
      )}
    </div>
  );
};

export default UnifiedDashboard;

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Grid3x3,
  TrendingUp,
  Users,
  GitMerge,
  DollarSign,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Handshake,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChapterMemberData } from "../../../shared/services/ChapterDataLoader";
import { useMatrixData } from "../hooks/useMatrixData";
import { MatrixSelector } from "./matrix-selector";
import { MatrixDisplay } from "./matrix-display";
import { TYFCBReport } from "./tyfcb-report";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatMonthYearLong } from "@/lib/utils";

interface MatrixTabProps {
  chapterData: ChapterMemberData;
}

const MatrixTab: React.FC<MatrixTabProps> = ({ chapterData }) => {
  const [activeMatrixTab, setActiveMatrixTab] = useState<
    "referral" | "oto" | "combination" | "tyfcb"
  >("referral");
  const { toast } = useToast();

  const {
    monthlyReports,
    selectedReport,
    referralMatrix,
    oneToOneMatrix,
    combinationMatrix,
    tyfcbData,
    isLoadingReports,
    isLoadingMatrices,
    error,
    handleReportChange,
  } = useMatrixData(chapterData.chapterId);

  // Calculate statistics from selected report's matrices
  const calculateStats = () => {
    if (!referralMatrix || !oneToOneMatrix) {
      return null;
    }

    const members = referralMatrix.members || [];
    const refMatrix = referralMatrix.matrix || [];
    const otoMatrix = oneToOneMatrix.matrix || [];

    let totalReferralsGiven = 0;
    let totalOTOs = 0;
    let membersWithReferrals = 0;
    let membersWithOTOs = 0;

    refMatrix.forEach((row, idx) => {
      const rowSum = row.reduce((sum: number, val: number) => sum + val, 0);
      totalReferralsGiven += rowSum;
      if (rowSum > 0) membersWithReferrals++;
    });

    otoMatrix.forEach((row, idx) => {
      const rowSum = row.reduce((sum: number, val: number) => sum + val, 0);
      totalOTOs += rowSum;
      if (rowSum > 0) membersWithOTOs++;
    });

    // Calculate averages
    const avgReferralsPerMember =
      members.length > 0
        ? (totalReferralsGiven / members.length).toFixed(1)
        : "0";
    const avgOTOsPerMember =
      members.length > 0 ? (totalOTOs / members.length).toFixed(1) : "0";
    const participationRate =
      members.length > 0
        ? ((membersWithReferrals / members.length) * 100).toFixed(0)
        : "0";

    return {
      totalMembers: members.length,
      totalReferralsGiven,
      totalOTOs,
      avgReferralsPerMember,
      avgOTOsPerMember,
      participationRate,
      membersWithReferrals,
      membersWithOTOs,
    };
  };

  const stats = calculateStats();

  if (isLoadingReports) {
    return (
      <div className="flex flex-col items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="mt-2 text-sm text-muted-foreground">
          Loading monthly reports...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Single-Month Analysis</h2>
        <p className="text-muted-foreground">
          View detailed matrices and reports for {chapterData.chapterName}
        </p>
      </div>

      {/* Report Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>Select Monthly Report</CardTitle>
          <CardDescription>Choose which month to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyReports.length === 0 ? (
            <Alert>
              <AlertDescription>
                No monthly reports have been uploaded yet for{" "}
                {chapterData.chapterName}. Use the "Upload" tab to upload
                chapter reports.
              </AlertDescription>
            </Alert>
          ) : (
            <MatrixSelector
              monthlyReports={monthlyReports}
              selectedReport={selectedReport}
              onReportChange={handleReportChange}
              onDownloadExcel={async () => {
                if (!selectedReport) return;

                try {
                  const response = await fetch(
                    `/api/chapters/${chapterData.chapterId}/reports/${selectedReport.id}/download-matrices/`,
                  );

                  if (!response.ok) {
                    throw new Error("Failed to download file");
                  }

                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${chapterData.chapterName.replace(/ /g, "_")}_Matrices_${selectedReport.month_year}.xlsx`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);

                  toast({
                    title: "Download Complete",
                    description: `Matrices for ${selectedReport.month_year} downloaded successfully`,
                    variant: "success",
                    duration: 3000,
                  });
                } catch (error) {
                  console.error("Failed to download Excel file:", error);
                  toast({
                    title: "Download Failed",
                    description:
                      "Failed to download Excel file. Please try again.",
                    variant: "destructive",
                    duration: 5000,
                  });
                }
              }}
              chapterId={chapterData.chapterId}
            />
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoadingMatrices && (
        <div className="flex flex-col items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="mt-2 text-sm text-muted-foreground">
            Loading matrices for {selectedReport?.month_year}...
          </p>
        </div>
      )}

      {/* Statistics Highlight Cards */}
      {selectedReport && !isLoadingMatrices && stats && (
        <div className="space-y-4">
          {/* Report Period Info */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      {formatMonthYearLong(selectedReport.month_year)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Report Period
                    </p>
                  </div>
                </div>
                {selectedReport.week_of_date && (
                  <Badge variant="outline" className="text-xs">
                    Week of{" "}
                    {format(
                      new Date(selectedReport.week_of_date),
                      "MMM d, yyyy",
                    )}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Members
                    </p>
                    <p className="text-3xl font-bold">{stats.totalMembers}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Active in this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Referrals
                    </p>
                    <p className="text-3xl font-bold">
                      {stats.totalReferralsGiven}
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <ArrowUpRight className="h-6 w-6 text-green-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Avg: {stats.avgReferralsPerMember} per member
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      One-to-Ones
                    </p>
                    <p className="text-3xl font-bold">{stats.totalOTOs}</p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Handshake className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Avg: {stats.avgOTOsPerMember} per member
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Participation
                    </p>
                    <p className="text-3xl font-bold">
                      {stats.participationRate}%
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.membersWithReferrals} gave referrals
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Matrix Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3x3 className="h-5 w-5" />
                Matrices & Reports
              </CardTitle>
              <CardDescription>
                Interactive matrices showing relationships and business results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Motion Tab Navigation */}
              <div className="flex items-center gap-2 flex-wrap mb-6">
                {[
                  {
                    id: "referral" as const,
                    label: "Referral Matrix",
                    icon: TrendingUp,
                  },
                  {
                    id: "oto" as const,
                    label: "One-to-One Matrix",
                    icon: Users,
                  },
                  {
                    id: "combination" as const,
                    label: "Combination Matrix",
                    icon: GitMerge,
                  },
                  {
                    id: "tyfcb" as const,
                    label: "TYFCB Report",
                    icon: DollarSign,
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeMatrixTab === tab.id;
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveMatrixTab(tab.id)}
                      className={`relative px-4 py-2 rounded-lg font-semibold transition-colors ${
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm hidden sm:inline">
                          {tab.label}
                        </span>
                        <span className="text-sm sm:hidden">
                          {tab.id === "referral"
                            ? "Referral"
                            : tab.id === "oto"
                              ? "One-to-One"
                              : tab.id === "combination"
                                ? "Combination"
                                : "TYFCB"}
                        </span>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="matrixActiveTab"
                          className="absolute inset-0 bg-secondary/20 rounded-lg -z-10"
                          transition={{
                            type: "spring",
                            bounce: 0.2,
                            duration: 0.6,
                          }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Tab Content with Animation */}
              <motion.div
                key={activeMatrixTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {activeMatrixTab === "referral" && (
                  <MatrixDisplay
                    matrixData={referralMatrix}
                    title="Referral Matrix"
                    description="Shows who has given referrals to whom. Numbers represent the count of referrals given."
                    matrixType="referral"
                  />
                )}

                {activeMatrixTab === "oto" && (
                  <MatrixDisplay
                    matrixData={oneToOneMatrix}
                    title="One-to-One Matrix"
                    description="Tracks one-to-one meetings between members. Numbers represent the count of meetings."
                    matrixType="oto"
                  />
                )}

                {activeMatrixTab === "combination" && (
                  <MatrixDisplay
                    matrixData={combinationMatrix}
                    title="Combination Matrix"
                    description="Combined view showing both referrals and one-to-ones using coded values."
                    matrixType="combination"
                  />
                )}

                {activeMatrixTab === "tyfcb" && (
                  <TYFCBReport tyfcbData={tyfcbData} />
                )}
              </motion.div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MatrixTab;

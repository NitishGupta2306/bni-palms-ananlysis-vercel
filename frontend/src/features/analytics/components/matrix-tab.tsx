import React, { useState } from "react";
import {
  Grid3x3,
  TrendingUp,
  Users,
  GitMerge,
  DollarSign,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChapterMemberData } from "../../../shared/services/ChapterDataLoader";
import { useMatrixData } from "../hooks/useMatrixData";
import { MatrixSelector } from "./matrix-selector";
import { MatrixDisplay } from "./matrix-display";
import { TYFCBReport } from "./tyfcb-report";
import { useToast } from "@/hooks/use-toast";

interface MatrixTabProps {
  chapterData: ChapterMemberData;
}

const MatrixTab: React.FC<MatrixTabProps> = ({ chapterData }) => {
  const [tabValue, setTabValue] = useState("referral");
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

  const handleDownloadExcel = async () => {
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
      });
    } catch (error) {
      console.error("Failed to download Excel file:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download Excel file. Please try again.",
        variant: "destructive",
      });
    }
  };

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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-2">
          <Grid3x3 className="h-5 w-5" />
          Matrices & Reports
        </h2>
        <p className="text-sm text-muted-foreground">
          Interactive matrices and TYFCB reports showing relationships and
          business results for {chapterData.chapterName}
        </p>
      </div>

      {/* Report Selection */}
      <MatrixSelector
        monthlyReports={monthlyReports}
        selectedReport={selectedReport}
        onReportChange={handleReportChange}
        onDownloadExcel={handleDownloadExcel}
        chapterId={chapterData.chapterId}
      />

      {/* No Reports State */}
      {monthlyReports.length === 0 && (
        <Alert>
          <AlertDescription>
            No monthly reports have been uploaded yet for{" "}
            {chapterData.chapterName}. Use the "Upload" tab to upload chapter
            reports.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading Matrices */}
      {isLoadingMatrices && (
        <div className="flex flex-col items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="mt-2 text-sm text-muted-foreground">
            Loading matrices for {selectedReport?.month_year}...
          </p>
        </div>
      )}

      {/* Matrix Content */}
      {selectedReport && !isLoadingMatrices && monthlyReports.length > 0 && (
        <Tabs value={tabValue} onValueChange={setTabValue}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="referral" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Referral Matrix</span>
              <span className="sm:hidden">Referral</span>
            </TabsTrigger>
            <TabsTrigger value="oto" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">One-to-One Matrix</span>
              <span className="sm:hidden">One-to-One</span>
            </TabsTrigger>
            <TabsTrigger
              value="combination"
              className="flex items-center gap-2"
            >
              <GitMerge className="h-4 w-4" />
              <span className="hidden sm:inline">Combination Matrix</span>
              <span className="sm:hidden">Combination</span>
            </TabsTrigger>
            <TabsTrigger value="tyfcb" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">TYFCB Report</span>
              <span className="sm:hidden">TYFCB</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="referral" className="mt-6">
            <MatrixDisplay
              matrixData={referralMatrix}
              title="Referral Matrix"
              description="Shows who has given referrals to whom. Numbers represent the count of referrals given."
              matrixType="referral"
            />
          </TabsContent>

          <TabsContent value="oto" className="mt-6">
            <MatrixDisplay
              matrixData={oneToOneMatrix}
              title="One-to-One Matrix"
              description="Tracks one-to-one meetings between members. Numbers represent the count of meetings."
              matrixType="oto"
            />
          </TabsContent>

          <TabsContent value="combination" className="mt-6">
            <MatrixDisplay
              matrixData={combinationMatrix}
              title="Combination Matrix"
              description="Combined view showing both referrals and one-to-ones using coded values."
              matrixType="combination"
            />
          </TabsContent>

          <TabsContent value="tyfcb" className="mt-6">
            <TYFCBReport tyfcbData={tyfcbData} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MatrixTab;

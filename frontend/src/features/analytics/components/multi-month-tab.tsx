import React, { useState, useEffect } from "react";
import { Calendar, Download, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MatrixDisplay } from "./matrix-display";
import { API_BASE_URL } from "@/config/api";

interface MonthlyReportListItem {
  id: number;
  month_year: string;
  uploaded_at: string | null;
  processed_at: string | null;
  has_referral_matrix: boolean;
  has_oto_matrix: boolean;
  has_combination_matrix: boolean;
}

interface MultiMonthTabProps {
  chapterId: number | string;
  chapterName: string;
}

interface AggregatedData {
  referral_matrix: any;
  oto_matrix: any;
  combination_matrix: any;
  tyfcb_inside: any;
  tyfcb_outside: any;
  member_completeness: Record<
    number,
    {
      member_name: string;
      present_in_all: boolean;
      months_present: string[];
      months_missing: string[];
      presence_count: number;
      total_months: number;
    }
  >;
  member_differences: Array<{
    member_id: number;
    member_name: string;
    last_active_month: string;
    business_name?: string;
    classification?: string;
  }>;
  month_range: string;
  total_months: number;
}

const MultiMonthTab: React.FC<MultiMonthTabProps> = ({
  chapterId,
  chapterName,
}) => {
  const [reports, setReports] = useState<MonthlyReportListItem[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  // Fetch available reports
  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/chapters/${chapterId}/reports/`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch reports");
        }
        const data = await response.json();
        setReports(data);
      } catch (error) {
        console.error("Error fetching reports:", error);
        toast({
          title: "Error",
          description: "Failed to load monthly reports",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [chapterId, toast]);

  const toggleReportSelection = (reportId: number) => {
    setSelectedReportIds((prev) => {
      if (prev.includes(reportId)) {
        return prev.filter((id) => id !== reportId);
      } else {
        return [...prev, reportId];
      }
    });
  };

  const selectAll = () => {
    setSelectedReportIds(reports.map((r) => r.id));
  };

  const clearAll = () => {
    setSelectedReportIds([]);
  };

  const generateAggregatedAnalysis = async () => {
    if (selectedReportIds.length === 0) {
      toast({
        title: "No reports selected",
        description: "Please select at least one monthly report",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chapters/${chapterId}/reports/aggregate/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            report_ids: selectedReportIds,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to generate aggregated analysis");
      }

      const data: AggregatedData = await response.json();
      setAggregatedData(data);

      toast({
        title: "Success",
        description: `Generated analysis for ${data.total_months} month(s)`,
      });
    } catch (error) {
      console.error("Error generating aggregated analysis:", error);
      toast({
        title: "Error",
        description: "Failed to generate aggregated analysis",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAggregatedPackage = async () => {
    if (selectedReportIds.length === 0) {
      toast({
        title: "No reports selected",
        description: "Please select at least one monthly report",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chapters/${chapterId}/reports/aggregate/download/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            report_ids: selectedReportIds,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to download package");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${chapterName}_Aggregated_Analysis.zip`;
      if (contentDisposition) {
        const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Download started",
      });
    } catch (error) {
      console.error("Error downloading package:", error);
      toast({
        title: "Error",
        description: "Failed to download aggregated package",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Format month_year for display (2025-01 -> Jan 2025)
  const formatMonthYear = (monthYear: string) => {
    try {
      const [year, month] = monthYear.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    } catch {
      return monthYear;
    }
  };

  // Get partial data members (not present in all months)
  const partialDataMembers = aggregatedData
    ? Object.entries(aggregatedData.member_completeness)
        .filter(([_, data]) => !data.present_in_all)
        .map(([id, data]) => ({
          id: parseInt(id),
          name: data.member_name,
          months_missing: data.months_missing,
        }))
    : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Multi-Month Analysis</h2>
        <p className="text-muted-foreground">
          Select one or more monthly reports to generate aggregated analysis
        </p>
      </div>

      {/* Report Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Monthly Reports</CardTitle>
              <CardDescription>
                Choose which months to include in the aggregated analysis
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No monthly reports found. Upload some data first.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {reports.map((report) => (
                <label
                  key={report.id}
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedReportIds.includes(report.id)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedReportIds.includes(report.id)}
                    onChange={() => toggleReportSelection(report.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {formatMonthYear(report.month_year)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {report.has_referral_matrix && report.has_oto_matrix
                        ? "Complete"
                        : "Partial data"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {selectedReportIds.length > 0 && (
            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 text-sm text-muted-foreground">
                <Calendar className="inline h-4 w-4 mr-1" />
                {selectedReportIds.length} month
                {selectedReportIds.length !== 1 ? "s" : ""} selected
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={generateAggregatedAnalysis}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Analysis"
                  )}
                </Button>
                <Button
                  onClick={downloadAggregatedPackage}
                  variant="outline"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download Package
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aggregated Results */}
      {aggregatedData && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
              <CardDescription>
                Aggregated data for {aggregatedData.month_range}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Total Months
                  </div>
                  <div className="text-2xl font-bold">
                    {aggregatedData.total_months}
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Partial Data Members
                  </div>
                  <div className="text-2xl font-bold">
                    {partialDataMembers.length}
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Inactive Members
                  </div>
                  <div className="text-2xl font-bold">
                    {aggregatedData.member_differences.length}
                  </div>
                </div>
              </div>

              {/* Partial Data Members Warning */}
              {partialDataMembers.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                    ⚠️ Members with Partial Data
                  </div>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    The following members were not present in all selected
                    months and will be highlighted in yellow/orange:
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {partialDataMembers.slice(0, 10).map((member) => (
                      <span
                        key={member.id}
                        className="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded text-xs"
                      >
                        {member.name}
                      </span>
                    ))}
                    {partialDataMembers.length > 10 && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded text-xs">
                        +{partialDataMembers.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Inactive Members List */}
              {aggregatedData.member_differences.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="font-medium text-red-900 dark:text-red-100 mb-2">
                    Members Who Became Inactive
                  </div>
                  <div className="space-y-1">
                    {aggregatedData.member_differences.map((member) => (
                      <div
                        key={member.member_id}
                        className="text-sm text-red-800 dark:text-red-200"
                      >
                        {member.member_name} - Last active:{" "}
                        {formatMonthYear(member.last_active_month)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Matrices */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Aggregated Matrices</h3>

            <MatrixDisplay
              matrixData={aggregatedData.referral_matrix}
              matrixType="referral"
              partialDataMembers={partialDataMembers.map((m) => m.name)}
            />

            <MatrixDisplay
              matrixData={aggregatedData.oto_matrix}
              matrixType="oto"
              partialDataMembers={partialDataMembers.map((m) => m.name)}
            />

            <MatrixDisplay
              matrixData={aggregatedData.combination_matrix}
              matrixType="combination"
              partialDataMembers={partialDataMembers.map((m) => m.name)}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default MultiMonthTab;

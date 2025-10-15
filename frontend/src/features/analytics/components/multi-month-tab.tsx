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

const MultiMonthTab: React.FC<MultiMonthTabProps> = ({
  chapterId,
  chapterName,
}) => {
  const [reports, setReports] = useState<MonthlyReportListItem[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const generateAndDownloadReport = async () => {
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
      // Generate and download the package directly
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
        throw new Error("Failed to generate report");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${chapterName}_Aggregated_Report.xlsx`;
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
        description: "Report generated and downloaded successfully",
        variant: "success",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate and download report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
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
                  onClick={generateAndDownloadReport}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiMonthTab;

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  TrendingUp,
  Users,
  Trash2,
  RefreshCw,
  Loader2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChapterMemberData,
  MonthlyReport,
  loadMonthlyReports,
  deleteMonthlyReport,
} from "@/shared/services/chapter-data-loader";

interface PreviousDataTabProps {
  chapterData: ChapterMemberData;
}

const PreviousDataTab: React.FC<PreviousDataTabProps> = ({ chapterData }) => {
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(
    null,
  );
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load monthly reports when component mounts
  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const reports = await loadMonthlyReports(chapterData.chapterId);
      setMonthlyReports(reports);

      // Select the most recent report by default
      if (reports.length > 0) {
        setSelectedReport(reports[0]);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load monthly reports",
      );
    } finally {
      setIsLoading(false);
    }
  }, [chapterData.chapterId]);

  useEffect(() => {
    if (chapterData.chapterId) {
      loadReports();
    }
  }, [chapterData.chapterId, loadReports]);

  const handleReportChange = (reportId: string) => {
    const report = monthlyReports.find((r) => r.id === parseInt(reportId));
    setSelectedReport(report || null);
  };

  const handleDeleteReport = async (reportToDelete: MonthlyReport) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the ${reportToDelete.month_year} report?`,
      )
    ) {
      return;
    }

    setDeletingReportId(reportToDelete.id);
    setError(null);
    try {
      await deleteMonthlyReport(chapterData.chapterId, reportToDelete.id);

      // Reload reports after deletion
      await loadReports();

      // Clear selection if the deleted report was selected
      if (selectedReport?.id === reportToDelete.id) {
        setSelectedReport(null);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete report",
      );
    } finally {
      setDeletingReportId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error State */}
      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Loading monthly reports...
            </span>
          </div>
        </div>
      )}

      {/* Report List */}
      {!isLoading && monthlyReports.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Available Reports</h3>
            <Button
              onClick={loadReports}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
          <div className="grid gap-3">
            {monthlyReports.map((report) => (
              <Card
                key={report.id}
                className={
                  selectedReport?.id === report.id ? "border-primary" : ""
                }
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <span className="text-lg font-semibold">
                            {report.month_year}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {report.has_referral_matrix && (
                            <Badge variant="secondary" className="text-xs">
                              Referrals
                            </Badge>
                          )}
                          {report.has_oto_matrix && (
                            <Badge variant="secondary" className="text-xs">
                              OTOs
                            </Badge>
                          )}
                          {report.has_combination_matrix && (
                            <Badge variant="secondary" className="text-xs">
                              Combined
                            </Badge>
                          )}
                          {report.require_palms_sheets && (
                            <Badge variant="default" className="text-xs">
                              PALMS Downloadable
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Uploaded:{" "}
                          {new Date(report.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleDeleteReport(report)}
                        disabled={deletingReportId === report.id}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingReportId === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Week Information */}
                    {report.week_of_date && (
                      <div className="pl-7 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Week:{" "}
                            {format(new Date(report.week_of_date), "MMM d")} -{" "}
                            {report.audit_period_end &&
                              format(
                                new Date(report.audit_period_end),
                                "MMM d, yyyy",
                              )}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Uploaded Files List */}
                    {report.uploaded_file_names &&
                      report.uploaded_file_names.length > 0 && (
                        <div className="pl-7">
                          <div className="text-xs text-muted-foreground mb-1">
                            Uploaded Files:
                          </div>
                          <div className="space-y-1">
                            {report.uploaded_file_names.map((file, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-xs"
                              >
                                <FileText className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">
                                  {file.original_filename}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {file.file_type === "slip_audit"
                                    ? "Slip Audit"
                                    : "Member Names"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Reports State */}
      {!isLoading && monthlyReports.length === 0 && !error && (
        <Alert>
          <AlertDescription>
            No monthly reports have been uploaded yet for{" "}
            {chapterData.chapterName}. Use the "Upload Palms Data" tab to upload
            PALMS slip audit reports.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PreviousDataTab;

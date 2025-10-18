import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Calendar, FileText } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { MonthlyReport } from "../../../shared/services/ChapterDataLoader";
import { useNotifications } from "@/hooks/useNotifications";
import { fetchWithAuth } from "@/lib/apiClient";
import { API_BASE_URL } from "@/config/api";

interface MatrixSelectorProps {
  monthlyReports: MonthlyReport[];
  selectedReport: MonthlyReport | null;
  onReportChange: (reportId: string) => void;
  onDownloadExcel: () => void;
  chapterId?: string;
}

export const MatrixSelector: React.FC<MatrixSelectorProps> = ({
  monthlyReports,
  selectedReport,
  onReportChange,
  onDownloadExcel,
  chapterId,
}) => {
  const { success, error } = useNotifications();

  const handleDownloadPalms = async () => {
    if (!selectedReport || !chapterId) return;

    // Check if PALMS sheets are available
    if (!selectedReport.require_palms_sheets) {
      error(
        "PALMS Sheets Not Available",
        "Original PALMS sheets were not marked as downloadable for this report."
      );
      return;
    }

    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/chapters/${chapterId}/reports/${selectedReport.id}/download-palms/`,
      );

      if (!response.ok) {
        throw new Error("Failed to download PALMS files");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Use week date in filename if available
      const dateStr = selectedReport.week_of_date
        ? `_${selectedReport.week_of_date}`
        : `_${selectedReport.month_year}`;

      link.download = `PALMS_Sheets${dateStr}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      success("Download Complete", "PALMS sheets downloaded successfully");
    } catch (err) {
      console.error("Failed to download PALMS files:", err);
      error("Download Failed", "Failed to download PALMS files. Please try again.");
    }
  };

  if (monthlyReports.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      {/* Left: Select + Week Info */}
      <div className="flex items-center gap-3 flex-1">
        <Select
          value={selectedReport?.id?.toString() || ""}
          onValueChange={onReportChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Report" />
          </SelectTrigger>
          <SelectContent>
            {monthlyReports.map((report) => (
              <SelectItem key={report.id} value={report.id.toString()}>
                {report.month_year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedReport?.week_of_date && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {formatDate(selectedReport.week_of_date, "short")} -{" "}
              {selectedReport.audit_period_end &&
                formatDate(selectedReport.audit_period_end, "short")}
            </span>
          </div>
        )}
      </div>

      {/* Right: Download Buttons */}
      {selectedReport && (
        <div className="flex gap-2">
          <Button
            onClick={onDownloadExcel}
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Matrices</span>
          </Button>
          {selectedReport.require_palms_sheets && (
            <Button
              onClick={handleDownloadPalms}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <FileText className="h-3 w-3" />
              <span className="hidden sm:inline">PALMS</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

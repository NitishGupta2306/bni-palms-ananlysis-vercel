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
import { format } from "date-fns";
import { MonthlyReport } from "../../../shared/services/ChapterDataLoader";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleDownloadPalms = async () => {
    if (!selectedReport || !chapterId) return;

    // Check if PALMS sheets are available
    if (!selectedReport.require_palms_sheets) {
      toast({
        title: "PALMS Sheets Not Available",
        description:
          "Original PALMS sheets were not marked as downloadable for this report.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/chapters/${chapterId}/reports/${selectedReport.id}/download-palms/`,
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

      toast({
        title: "Download Complete",
        description: `PALMS sheets downloaded successfully`,
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to download PALMS files:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download PALMS files. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  if (monthlyReports.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="w-full sm:w-80">
          <Select
            value={selectedReport?.id?.toString() || ""}
            onValueChange={onReportChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Monthly Report" />
            </SelectTrigger>
            <SelectContent>
              {monthlyReports.map((report) => (
                <SelectItem key={report.id} value={report.id.toString()}>
                  {report.month_year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedReport && (
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={onDownloadExcel}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Matrices
            </Button>
            {selectedReport.require_palms_sheets && (
              <Button
                onClick={handleDownloadPalms}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Download PALMS Sheets
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Week Information Banner */}
      {selectedReport?.week_of_date && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-md border text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Data from Week of:</span>
          <span className="font-semibold">
            {format(new Date(selectedReport.week_of_date), "MMM d")} -{" "}
            {selectedReport.audit_period_end &&
              format(new Date(selectedReport.audit_period_end), "MMM d, yyyy")}
          </span>
          {selectedReport.require_palms_sheets && (
            <Badge variant="default" className="ml-2">
              PALMS Downloadable
            </Badge>
          )}
        </div>
      )}

      {/* Uploaded Files Info */}
      {selectedReport?.uploaded_file_names &&
        selectedReport.uploaded_file_names.length > 0 && (
          <div className="px-4 py-2 bg-muted/30 rounded-md border text-xs">
            <div className="text-muted-foreground mb-1">Source Files:</div>
            <div className="flex flex-wrap gap-2">
              {selectedReport.uploaded_file_names.map((file, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {file.original_filename}
                </Badge>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};

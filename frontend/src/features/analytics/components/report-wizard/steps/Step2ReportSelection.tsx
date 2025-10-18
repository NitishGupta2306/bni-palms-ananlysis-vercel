/**
 * Step 2: Report Selection
 *
 * Extracted from report-wizard-tab.tsx for better maintainability.
 * Uses ReportCard foundation component for consistent report display.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { ReportCard } from "../components/ReportCard";
import { MonthlyReportListItem } from "../types";

interface Step2Props {
  reportType: "single" | "multi" | "compare";
  reports: MonthlyReportListItem[];
  isLoadingReports: boolean;
  selectedReportId?: number | null;
  selectedReportIds?: number[];
  compareReportIds?: { current: number | null; previous: number | null };
  onSelectSingle: (id: number) => void;
  onSelectMulti: (id: number) => void;
  onSelectCompare: (id: number, type: "current" | "previous") => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step2ReportSelection: React.FC<Step2Props> = ({
  reportType,
  reports,
  isLoadingReports,
  selectedReportId,
  selectedReportIds = [],
  compareReportIds = { current: null, previous: null },
  onSelectSingle,
  onSelectMulti,
  onSelectCompare,
  onBack,
  onNext,
}) => {
  const getSelectionTitle = () => {
    switch (reportType) {
      case "single":
        return "Select a Report";
      case "multi":
        return "Select Multiple Reports";
      case "compare":
        return "Select Two Reports to Compare";
      default:
        return "Select Reports";
    }
  };

  const getSelectionDescription = () => {
    switch (reportType) {
      case "single":
        return "Choose one month to view detailed matrices";
      case "multi":
        return "Choose multiple months to aggregate";
      case "compare":
        return "Choose current period and previous period for comparison";
      default:
        return "";
    }
  };

  const canProceed = () => {
    switch (reportType) {
      case "single":
        return selectedReportId !== null;
      case "multi":
        return selectedReportIds.length >= 2;
      case "compare":
        return compareReportIds.current !== null && compareReportIds.previous !== null;
      default:
        return false;
    }
  };

  if (isLoadingReports) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No reports available. Upload some data first to generate reports.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{getSelectionTitle()}</h3>
        <p className="text-sm text-muted-foreground">{getSelectionDescription()}</p>
      </div>

      {reportType === "compare" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Period */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Current Period</h4>
            <div className="space-y-2">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  isSelected={compareReportIds.current === report.id}
                  onClick={() => onSelectCompare(report.id, "current")}
                  variant="compare"
                  compareType="current"
                />
              ))}
            </div>
          </div>

          {/* Previous Period */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Previous Period</h4>
            <div className="space-y-2">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  isSelected={compareReportIds.previous === report.id}
                  onClick={() => onSelectCompare(report.id, "previous")}
                  variant="compare"
                  compareType="previous"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {reportType === "single" && (
        <div className="space-y-2">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isSelected={selectedReportId === report.id}
              onClick={() => onSelectSingle(report.id)}
              variant="single"
            />
          ))}
        </div>
      )}

      {reportType === "multi" && (
        <div className="space-y-2">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isSelected={selectedReportIds.includes(report.id)}
              onClick={() => onSelectMulti(report.id)}
              variant="multi"
            />
          ))}
          {selectedReportIds.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {selectedReportIds.length} {selectedReportIds.length === 1 ? "report" : "reports"} selected for aggregation
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed()}>
          Next Step
        </Button>
      </div>
    </div>
  );
};

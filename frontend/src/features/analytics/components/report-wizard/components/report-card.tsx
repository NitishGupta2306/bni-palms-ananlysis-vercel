import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2 } from "lucide-react";
import { MonthlyReportListItem } from "../context/report-wizard-context";
import { formatMonthYearShort } from "@/lib/date-utils";

type ReportCardVariant = "single" | "multi" | "compare";

interface ReportCardProps {
  report: MonthlyReportListItem;
  isSelected: boolean;
  onClick: () => void;
  variant: ReportCardVariant;
  compareType?: "current" | "previous";
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  isSelected,
  onClick,
  variant,
  compareType,
}) => {
  const formatDate = (dateStr: string) => {
    try {
      // Parse "YYYY-MM" format
      const [year, month] = dateStr.split('-').map(Number);
      return formatMonthYearShort(year, month);
    } catch {
      return dateStr;
    }
  };

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary"
          : "hover:border-primary/50"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {variant === "multi" && (
              <Checkbox checked={isSelected} className="mt-1" />
            )}
            {variant === "single" && isSelected && (
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">
                  {formatDate(report.month_year)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge
                  variant={
                    report.status === "processed" ? "default" : "secondary"
                  }
                  className="text-xs"
                >
                  {report.status}
                </Badge>
                {compareType && (
                  <Badge variant="outline" className="text-xs">
                    {compareType === "current" ? "Current Period" : "Previous Period"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

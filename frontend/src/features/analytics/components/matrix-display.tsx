import React, { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MatrixData, MatrixType } from "../types/matrix.types";
import { MatrixLegend } from "./matrix-legend";
import { MatrixTableHeader } from "./matrix-table-header";
import { MatrixTableBody } from "./matrix-table-body";
import { useMatrixSort } from "../hooks/use-matrix-sort";

interface MatrixDisplayProps {
  matrixData: MatrixData | null;
  title?: string;
  description?: string;
  matrixType?: MatrixType;
  partialDataMembers?: string[];
}

export const MatrixDisplay: React.FC<MatrixDisplayProps> = ({
  matrixData,
  title,
  description,
  matrixType = "referral",
  partialDataMembers = [],
}) => {
  // Extract data safely with useMemo to prevent dependency issues
  const members = useMemo(() => matrixData?.members || [], [matrixData?.members]);
  const matrix = useMemo(() => matrixData?.matrix || [], [matrixData?.matrix]);
  const totals = useMemo(() => matrixData?.totals, [matrixData?.totals]);
  const summaries = useMemo(() => matrixData?.summaries, [matrixData?.summaries]);
  const legend = matrixData?.legend;
  const hasData = matrix.some((row) => row.some((cell) => cell > 0));

  // Use sorting hook
  const {
    sortColumn,
    sortDirection,
    sortType,
    handleColumnSort,
    handleSummarySort,
    sortedData,
  } = useMatrixSort({
    members,
    matrix,
    totals,
    summaries,
  });

  // Use sorted data for rendering
  const displayMembers = sortedData.members;
  const displayMatrix = sortedData.matrix;
  const displayTotals = sortedData.totals;
  const displaySummaries = sortedData.summaries;

  // Early returns after all hooks
  if (!matrixData) {
    return (
      <Alert>
        <AlertDescription>
          No data available for {title ? title.toLowerCase() : ""}
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasData) {
    return (
      <Alert>
        <AlertDescription>
          No {title ? title.toLowerCase() : "matrix"} data available for this
          chapter yet. Data will appear after importing PALMS reports.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>

        {legend && <MatrixLegend legend={legend} />}

        {/* Matrix Table */}
        <div
          className="rounded-md border"
          role="region"
          aria-label={`${title || "Matrix"} data table`}
        >
          <div className="max-h-96 overflow-auto">
            <Table>
              <MatrixTableHeader
                members={displayMembers}
                matrixType={matrixType}
                totals={displayTotals}
                summaries={displaySummaries}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                sortType={sortType}
                partialDataMembers={partialDataMembers}
                onColumnSort={handleColumnSort}
                onSummarySort={handleSummarySort}
              />
              <MatrixTableBody
                members={displayMembers}
                matrix={displayMatrix}
                matrixType={matrixType}
                totals={displayTotals}
                summaries={displaySummaries}
                partialDataMembers={partialDataMembers}
              />
            </Table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

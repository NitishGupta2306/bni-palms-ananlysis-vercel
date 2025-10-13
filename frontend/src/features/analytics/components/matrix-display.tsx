import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MatrixData, MatrixType } from "../types/matrix.types";
import { MatrixLegend } from "./matrix-legend";

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
  if (!matrixData) {
    return (
      <Alert>
        <AlertDescription>
          No data available for {title ? title.toLowerCase() : ""}
        </AlertDescription>
      </Alert>
    );
  }

  const { members, matrix, totals, summaries, legend } = matrixData;
  const hasData = matrix.some((row) => row.some((cell) => cell > 0));

  if (!hasData) {
    return (
      <Alert>
        <AlertDescription>
          No {title ? title.toLowerCase() : "matrix"} data available for this chapter yet. Data
          will appear after importing PALMS reports.
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
        <div className="rounded-md border">
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="font-bold min-w-[120px] sticky left-0 bg-background">
                    Giver \ Receiver
                  </TableHead>
                  {members.map((member, index) => (
                    <TableHead
                      key={index}
                      className="font-bold min-w-[40px] max-w-[40px] text-xs p-2"
                      style={{
                        writingMode: "vertical-rl",
                        textOrientation: "mixed",
                      }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {member
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{member}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  ))}
                  {/* Summary columns based on matrix type */}
                  {matrixType === "combination" && summaries ? (
                    <>
                      <TableHead className="font-bold min-w-[80px] text-xs">
                        Neither
                      </TableHead>
                      <TableHead className="font-bold min-w-[80px] text-xs">
                        OTO Only
                      </TableHead>
                      <TableHead className="font-bold min-w-[80px] text-xs">
                        Referral Only
                      </TableHead>
                      <TableHead className="font-bold min-w-[80px] text-xs">
                        OTO & Referral
                      </TableHead>
                    </>
                  ) : totals ? (
                    <>
                      <TableHead className="font-bold min-w-[80px] text-xs">
                        {matrixType === "oto" ? "Total OTO" : "Total Referrals"}
                      </TableHead>
                      <TableHead className="font-bold min-w-[80px] text-xs">
                        {matrixType === "oto"
                          ? "Unique OTO"
                          : "Unique Referrals"}
                      </TableHead>
                    </>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((giver, i) => (
                  <TableRow key={i} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-sm sticky left-0 bg-background">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{giver}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{giver}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    {members.map((receiver, j) => (
                      <TableCell
                        key={j}
                        className={`text-center ${
                          matrix[i][j] > 0
                            ? "bg-primary/20 dark:bg-primary/30 font-bold text-primary"
                            : ""
                        }`}
                      >
                        {matrix[i][j] || "-"}
                      </TableCell>
                    ))}
                    {/* Summary values based on matrix type */}
                    {matrixType === "combination" && summaries ? (
                      <>
                        <TableCell className="font-bold text-center">
                          {summaries.neither?.[giver] || 0}
                        </TableCell>
                        <TableCell className="font-bold text-center">
                          {summaries.oto_only?.[giver] || 0}
                        </TableCell>
                        <TableCell className="font-bold text-center">
                          {summaries.referral_only?.[giver] || 0}
                        </TableCell>
                        <TableCell className="font-bold text-center">
                          {summaries.both?.[giver] || 0}
                        </TableCell>
                      </>
                    ) : totals ? (
                      <>
                        <TableCell className="font-bold text-center">
                          {totals.given?.[giver] || 0}
                        </TableCell>
                        <TableCell className="font-bold text-center">
                          {totals.unique_given?.[giver] || 0}
                        </TableCell>
                      </>
                    ) : null}
                  </TableRow>
                ))}
                {/* Totals received row */}
                {totals?.received && (
                  <TableRow>
                    <TableCell className="font-bold sticky left-0 bg-background">
                      Total Received
                    </TableCell>
                    {members.map((member, i) => (
                      <TableCell key={i} className="font-bold text-center">
                        {totals.received?.[member] || 0}
                      </TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

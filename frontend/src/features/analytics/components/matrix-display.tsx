import React, { useState, useMemo } from "react";
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
import { ArrowUp, ArrowDown } from "lucide-react";
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
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [sortType, setSortType] = useState<
    "member" | "total_given" | "unique_given"
  >("member");

  // Extract data safely
  const members = matrixData?.members || [];
  const matrix = matrixData?.matrix || [];
  const totals = matrixData?.totals;
  const summaries = matrixData?.summaries;
  const legend = matrixData?.legend;
  const hasData = matrix.some((row) => row.some((cell) => cell > 0));

  // Helper function to check if member has partial data
  const isPartialDataMember = (memberName: string) => {
    return partialDataMembers.includes(memberName);
  };

  // Handle column sort (for member columns)
  const handleColumnSort = (columnIndex: number) => {
    if (sortColumn === columnIndex && sortType === "member") {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column, default to descending
      setSortColumn(columnIndex);
      setSortType("member");
      setSortDirection("desc");
    }
  };

  // Handle summary column sort (for Total/Unique columns)
  const handleSummarySort = (type: "total_given" | "unique_given") => {
    if (sortType === type) {
      // Toggle direction if clicking same type
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new sort type, default to descending
      setSortType(type);
      setSortColumn(null);
      setSortDirection("desc");
    }
  };

  // Compute sorted data using useMemo
  const sortedData = useMemo(() => {
    if (sortColumn === null && sortType === "member") {
      return { members, matrix, totals, summaries };
    }

    // Create array of indices with their sort values
    let sortIndices: Array<{ index: number; value: number }>;

    if (sortType === "member" && sortColumn !== null) {
      // Sort by member column (received counts)
      const columnTotals = members.map((_, colIndex) => {
        return matrix.reduce((sum, row) => sum + row[colIndex], 0);
      });
      sortIndices = members.map((_, index) => ({
        index,
        value: columnTotals[index],
      }));
    } else if (sortType === "total_given" && totals?.given) {
      // Sort by Total Given column
      sortIndices = members.map((member, index) => ({
        index,
        value: totals.given?.[member] || 0,
      }));
    } else if (sortType === "unique_given" && totals?.unique_given) {
      // Sort by Unique Given column
      sortIndices = members.map((member, index) => ({
        index,
        value: totals.unique_given?.[member] || 0,
      }));
    } else {
      // No valid sort, return unsorted
      return { members, matrix, totals, summaries };
    }

    // Sort indices based on values
    sortIndices.sort((a, b) => {
      if (sortDirection === "desc") {
        return b.value - a.value;
      } else {
        return a.value - b.value;
      }
    });

    // Reorder members
    const sortedMembers = sortIndices.map((item) => members[item.index]);

    // Reorder matrix (both rows and columns)
    const sortedMatrix = sortIndices.map((rowItem) =>
      sortIndices.map((colItem) => matrix[rowItem.index][colItem.index]),
    );

    // Reorder totals if they exist
    const sortedTotals = totals
      ? {
          given: sortedMembers.reduce(
            (acc, member, newIndex) => {
              const oldMember = members[sortIndices[newIndex].index];
              if (totals.given?.[oldMember] !== undefined) {
                acc[member] = totals.given[oldMember];
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
          received: sortedMembers.reduce(
            (acc, member, newIndex) => {
              const oldMember = members[sortIndices[newIndex].index];
              if (totals.received?.[oldMember] !== undefined) {
                acc[member] = totals.received[oldMember];
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
          unique_given: sortedMembers.reduce(
            (acc, member, newIndex) => {
              const oldMember = members[sortIndices[newIndex].index];
              if (totals.unique_given?.[oldMember] !== undefined) {
                acc[member] = totals.unique_given[oldMember];
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
        }
      : undefined;

    // Reorder summaries if they exist
    const sortedSummaries = summaries
      ? {
          neither: sortedMembers.reduce(
            (acc, member, newIndex) => {
              const oldMember = members[sortIndices[newIndex].index];
              if (summaries.neither?.[oldMember] !== undefined) {
                acc[member] = summaries.neither[oldMember];
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
          oto_only: sortedMembers.reduce(
            (acc, member, newIndex) => {
              const oldMember = members[sortIndices[newIndex].index];
              if (summaries.oto_only?.[oldMember] !== undefined) {
                acc[member] = summaries.oto_only[oldMember];
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
          referral_only: sortedMembers.reduce(
            (acc, member, newIndex) => {
              const oldMember = members[sortIndices[newIndex].index];
              if (summaries.referral_only?.[oldMember] !== undefined) {
                acc[member] = summaries.referral_only[oldMember];
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
          both: sortedMembers.reduce(
            (acc, member, newIndex) => {
              const oldMember = members[sortIndices[newIndex].index];
              if (summaries.both?.[oldMember] !== undefined) {
                acc[member] = summaries.both[oldMember];
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
        }
      : undefined;

    return {
      members: sortedMembers,
      matrix: sortedMatrix,
      totals: sortedTotals,
      summaries: sortedSummaries,
    };
  }, [members, matrix, totals, summaries, sortColumn, sortDirection, sortType]);

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
        <div className="rounded-md border" role="region" aria-label={`${title || "Matrix"} data table`}>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="font-bold min-w-[120px] sticky left-0 bg-background">
                    Giver \ Receiver
                  </TableHead>
                  {displayMembers.map((member, index) => (
                    <TableHead
                      key={index}
                      className={`font-bold min-w-[40px] max-w-[40px] text-xs p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                        sortColumn === index ? "bg-primary/10" : ""
                      } ${isPartialDataMember(member) ? "bg-yellow-500/20 dark:bg-yellow-600/30" : ""}`}
                      style={{
                        writingMode: "vertical-rl",
                        textOrientation: "mixed",
                      }}
                      onClick={() => handleColumnSort(index)}
                      aria-label={`${member}, ${isPartialDataMember(member) ? "partial data, " : ""}click to sort by received count`}
                      aria-sort={sortColumn === index ? (sortDirection === "desc" ? "descending" : "ascending") : "none"}
                      role="columnheader"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center gap-1">
                            <span className="cursor-pointer">
                              {member
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </span>
                            {sortColumn === index && (
                              <span className="text-primary">
                                {sortDirection === "desc" ? (
                                  <ArrowDown className="h-3 w-3" />
                                ) : (
                                  <ArrowUp className="h-3 w-3" />
                                )}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div>
                            <p>{member}</p>
                            {isPartialDataMember(member) && (
                              <p className="text-xs text-yellow-500 mt-1">
                                ⚠ Not in all selected months
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Click to sort
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  ))}
                  {/* Summary columns based on matrix type */}
                  {matrixType === "combination" && displaySummaries ? (
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
                  ) : displayTotals ? (
                    <>
                      <TableHead
                        className={`font-bold min-w-[80px] text-xs cursor-pointer hover:bg-muted/50 transition-colors ${
                          sortType === "total_given" ? "bg-primary/10" : ""
                        }`}
                        onClick={() => handleSummarySort("total_given")}
                        aria-label={`Sort by ${matrixType === "oto" ? "total one-to-ones" : "total referrals"}`}
                        aria-sort={sortType === "total_given" ? (sortDirection === "desc" ? "descending" : "ascending") : "none"}
                        role="columnheader"
                      >
                        <div className="flex items-center gap-1 justify-center">
                          {matrixType === "oto"
                            ? "Total OTO"
                            : "Total Referrals"}
                          {sortType === "total_given" && (
                            <span className="text-primary">
                              {sortDirection === "desc" ? (
                                <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUp className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className={`font-bold min-w-[80px] text-xs cursor-pointer hover:bg-muted/50 transition-colors ${
                          sortType === "unique_given" ? "bg-primary/10" : ""
                        }`}
                        onClick={() => handleSummarySort("unique_given")}
                        aria-label={`Sort by ${matrixType === "oto" ? "unique one-to-ones" : "unique referrals"}`}
                        aria-sort={sortType === "unique_given" ? (sortDirection === "desc" ? "descending" : "ascending") : "none"}
                        role="columnheader"
                      >
                        <div className="flex items-center gap-1 justify-center">
                          {matrixType === "oto"
                            ? "Unique OTO"
                            : "Unique Referrals"}
                          {sortType === "unique_given" && (
                            <span className="text-primary">
                              {sortDirection === "desc" ? (
                                <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUp className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    </>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayMembers.map((giver, i) => (
                  <TableRow key={i} className="hover:bg-muted/50">
                    <TableCell
                      className={`font-medium text-sm sticky left-0 bg-background ${
                        isPartialDataMember(giver)
                          ? "bg-yellow-500/20 dark:bg-yellow-600/30"
                          : ""
                      }`}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{giver}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div>
                            <p>{giver}</p>
                            {isPartialDataMember(giver) && (
                              <p className="text-xs text-yellow-500 mt-1">
                                ⚠ Not in all selected months
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    {displayMembers.map((receiver, j) => (
                      <TableCell
                        key={j}
                        className={`text-center ${
                          displayMatrix[i][j] > 0
                            ? "bg-primary/20 dark:bg-primary/30 font-bold text-primary"
                            : ""
                        }`}
                        aria-label={`${giver} to ${receiver}: ${displayMatrix[i][j] || 0} ${matrixType === "oto" ? "one-to-ones" : matrixType === "combination" ? "connections" : "referrals"}`}
                      >
                        {displayMatrix[i][j] || "-"}
                      </TableCell>
                    ))}
                    {/* Summary values based on matrix type */}
                    {matrixType === "combination" && displaySummaries ? (
                      <>
                        <TableCell className="font-bold text-center">
                          {displaySummaries.neither?.[giver] || 0}
                        </TableCell>
                        <TableCell className="font-bold text-center">
                          {displaySummaries.oto_only?.[giver] || 0}
                        </TableCell>
                        <TableCell className="font-bold text-center">
                          {displaySummaries.referral_only?.[giver] || 0}
                        </TableCell>
                        <TableCell className="font-bold text-center">
                          {displaySummaries.both?.[giver] || 0}
                        </TableCell>
                      </>
                    ) : displayTotals ? (
                      <>
                        <TableCell className="font-bold text-center">
                          {displayTotals.given?.[giver] || 0}
                        </TableCell>
                        <TableCell className="font-bold text-center">
                          {displayTotals.unique_given?.[giver] || 0}
                        </TableCell>
                      </>
                    ) : null}
                  </TableRow>
                ))}
                {/* Totals received row */}
                {displayTotals?.received && (
                  <TableRow>
                    <TableCell className="font-bold sticky left-0 bg-background">
                      Total Received
                    </TableCell>
                    {displayMembers.map((member, i) => (
                      <TableCell key={i} className="font-bold text-center">
                        {displayTotals.received?.[member] || 0}
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

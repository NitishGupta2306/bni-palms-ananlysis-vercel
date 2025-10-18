import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUp, ArrowDown } from "lucide-react";
import { MatrixType } from "../types/matrix.types";
import { MatrixTotals, MatrixSummaries } from "../types/matrix.types";
import { SortType, SortDirection } from "../hooks/use-matrix-sort";

interface MatrixTableHeaderProps {
  members: string[];
  matrixType: MatrixType;
  totals?: MatrixTotals;
  summaries?: MatrixSummaries;
  sortColumn: number | null;
  sortDirection: SortDirection;
  sortType: SortType;
  partialDataMembers: string[];
  onColumnSort: (index: number) => void;
  onSummarySort: (type: "total_given" | "unique_given") => void;
}

export const MatrixTableHeader: React.FC<MatrixTableHeaderProps> = ({
  members,
  matrixType,
  totals,
  summaries,
  sortColumn,
  sortDirection,
  sortType,
  partialDataMembers,
  onColumnSort,
  onSummarySort,
}) => {
  const isPartialDataMember = (memberName: string) => {
    return partialDataMembers.includes(memberName);
  };

  return (
    <TableHeader className="sticky top-0 bg-background">
      <TableRow>
        <TableHead className="font-bold min-w-[120px] sticky left-0 bg-background">
          Giver \ Receiver
        </TableHead>
        {members.map((member, index) => (
          <TableHead
            key={index}
            className={`font-bold min-w-[40px] max-w-[40px] text-xs p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
              sortColumn === index ? "bg-primary/10" : ""
            } ${isPartialDataMember(member) ? "bg-yellow-500/20 dark:bg-yellow-600/30" : ""}`}
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
            }}
            onClick={() => onColumnSort(index)}
            aria-label={`${member}, ${isPartialDataMember(member) ? "partial data, " : ""}click to sort by received count`}
            aria-sort={
              sortColumn === index
                ? sortDirection === "desc"
                  ? "descending"
                  : "ascending"
                : "none"
            }
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
            <TableHead
              className={`font-bold min-w-[80px] text-xs cursor-pointer hover:bg-muted/50 transition-colors ${
                sortType === "total_given" ? "bg-primary/10" : ""
              }`}
              onClick={() => onSummarySort("total_given")}
              aria-label={`Sort by ${matrixType === "oto" ? "total one-to-ones" : "total referrals"}`}
              aria-sort={
                sortType === "total_given"
                  ? sortDirection === "desc"
                    ? "descending"
                    : "ascending"
                  : "none"
              }
              role="columnheader"
            >
              <div className="flex items-center gap-1 justify-center">
                {matrixType === "oto" ? "Total OTO" : "Total Referrals"}
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
              onClick={() => onSummarySort("unique_given")}
              aria-label={`Sort by ${matrixType === "oto" ? "unique one-to-ones" : "unique referrals"}`}
              aria-sort={
                sortType === "unique_given"
                  ? sortDirection === "desc"
                    ? "descending"
                    : "ascending"
                  : "none"
              }
              role="columnheader"
            >
              <div className="flex items-center gap-1 justify-center">
                {matrixType === "oto" ? "Unique OTO" : "Unique Referrals"}
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
  );
};

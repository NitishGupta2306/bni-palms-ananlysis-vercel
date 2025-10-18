import React from "react";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MatrixType } from "../types/matrix.types";
import { MatrixTotals, MatrixSummaries } from "../types/matrix.types";

interface MatrixTableBodyProps {
  members: string[];
  matrix: number[][];
  matrixType: MatrixType;
  totals?: MatrixTotals;
  summaries?: MatrixSummaries;
  partialDataMembers: string[];
}

export const MatrixTableBody: React.FC<MatrixTableBodyProps> = ({
  members,
  matrix,
  matrixType,
  totals,
  summaries,
  partialDataMembers,
}) => {
  const isPartialDataMember = (memberName: string) => {
    return partialDataMembers.includes(memberName);
  };

  return (
    <TableBody>
      {members.map((giver, i) => (
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
          {members.map((receiver, j) => (
            <TableCell
              key={j}
              className={`text-center ${
                matrix[i][j] > 0
                  ? "bg-primary/20 dark:bg-primary/30 font-bold text-primary"
                  : ""
              }`}
              aria-label={`${giver} to ${receiver}: ${matrix[i][j] || 0} ${
                matrixType === "oto"
                  ? "one-to-ones"
                  : matrixType === "combination"
                    ? "connections"
                    : "referrals"
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
  );
};

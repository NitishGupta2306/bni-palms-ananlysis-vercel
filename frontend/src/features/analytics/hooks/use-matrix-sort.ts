import { useState, useMemo } from "react";
import { MatrixTotals, MatrixSummaries } from "../types/matrix.types";

export type SortType = "member" | "total_given" | "unique_given";
export type SortDirection = "asc" | "desc";

interface UseMatrixSortProps {
  members: string[];
  matrix: number[][];
  totals?: MatrixTotals;
  summaries?: MatrixSummaries;
}

interface UseMatrixSortReturn {
  sortColumn: number | null;
  sortDirection: SortDirection;
  sortType: SortType;
  handleColumnSort: (columnIndex: number) => void;
  handleSummarySort: (type: "total_given" | "unique_given") => void;
  sortedData: {
    members: string[];
    matrix: number[][];
    totals?: MatrixTotals;
    summaries?: MatrixSummaries;
  };
}

/**
 * Custom hook to handle matrix sorting logic
 * Supports sorting by:
 * - Member columns (received counts)
 * - Total given counts
 * - Unique given counts
 */
export const useMatrixSort = ({
  members,
  matrix,
  totals,
  summaries,
}: UseMatrixSortProps): UseMatrixSortReturn => {
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sortType, setSortType] = useState<SortType>("member");

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

  return {
    sortColumn,
    sortDirection,
    sortType,
    handleColumnSort,
    handleSummarySort,
    sortedData,
  };
};

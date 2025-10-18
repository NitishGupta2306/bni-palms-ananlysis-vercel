import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;

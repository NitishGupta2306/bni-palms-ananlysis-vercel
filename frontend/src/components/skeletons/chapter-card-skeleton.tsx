import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const ChapterCardSkeleton: React.FC = () => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        {/* Action button */}
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
};

export default ChapterCardSkeleton;

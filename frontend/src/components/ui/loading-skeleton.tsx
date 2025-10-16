import React from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  message?: string;
  className?: string;
  variant?: 'default' | 'card' | 'inline';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  message = 'Loading...',
  className,
  variant = 'default',
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );

  if (variant === 'card') {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="p-12">{content}</CardContent>
      </Card>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
      {content}
    </div>
  );
};

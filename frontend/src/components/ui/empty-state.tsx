import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  variant?: 'default' | 'card';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}) => {
  const content = (
    <div className="flex flex-col items-center text-center space-y-4">
      <div className="p-4 rounded-full bg-muted/50">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="space-y-2 max-w-md">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {action && (
        <Button onClick={action.onClick} size="lg" className="mt-4">
          {action.icon && <action.icon className="mr-2 h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );

  if (variant === 'card') {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="p-12">{content}</CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('flex items-center justify-center min-h-[400px] py-12', className)}>
      {content}
    </div>
  );
};

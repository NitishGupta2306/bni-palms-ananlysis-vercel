import React from 'react';
import { X, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useDownloadQueue, DownloadTask } from '@/contexts/download-queue-context';
import { cn } from '@/lib/utils';

interface DownloadProgressItemProps {
  task: DownloadTask;
  onRemove: (id: string) => void;
}

const DownloadProgressItem: React.FC<DownloadProgressItemProps> = ({ task, onRemove }) => {
  const getStatusIcon = () => {
    switch (task.status) {
      case 'pending':
      case 'downloading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case 'pending':
        return 'Queued';
      case 'downloading':
        return `Downloading... ${task.progress}%`;
      case 'completed':
        return 'Complete';
      case 'error':
        return task.error || 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 border rounded-lg transition-all',
        task.status === 'completed' && 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
        task.status === 'error' && 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
        task.status === 'downloading' && 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
      )}
    >
      {getStatusIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.filename}</p>
        <p className="text-xs text-muted-foreground">{getStatusText()}</p>
        {task.status === 'downloading' && task.progress > 0 && (
          <Progress value={task.progress} className="h-1 mt-1" />
        )}
      </div>
      {(task.status === 'completed' || task.status === 'error') && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(task.id)}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export const DownloadProgressPanel: React.FC = () => {
  const { tasks, removeTask, clearCompleted } = useDownloadQueue();

  // Don't render if no tasks
  if (tasks.length === 0) {
    return null;
  }

  const hasCompleted = tasks.some((task) => task.status === 'completed');

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="shadow-lg border-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Download className="h-4 w-4" />
              Downloads ({tasks.length})
            </h3>
            {hasCompleted && (
              <Button variant="ghost" size="sm" onClick={clearCompleted}>
                Clear completed
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {tasks.map((task) => (
              <DownloadProgressItem key={task.id} task={task} onRemove={removeTask} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

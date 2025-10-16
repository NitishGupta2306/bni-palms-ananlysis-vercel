import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface DownloadTask {
  id: string;
  filename: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  error?: string;
  startTime: number;
}

interface DownloadQueueContextType {
  tasks: DownloadTask[];
  addDownload: (filename: string, downloadFn: () => Promise<Blob>) => Promise<void>;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
}

const DownloadQueueContext = createContext<DownloadQueueContextType | undefined>(undefined);

export const useDownloadQueue = () => {
  const context = useContext(DownloadQueueContext);
  if (!context) {
    throw new Error('useDownloadQueue must be used within a DownloadQueueProvider');
  }
  return context;
};

interface DownloadQueueProviderProps {
  children: ReactNode;
}

export const DownloadQueueProvider: React.FC<DownloadQueueProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const { toast } = useToast();

  const generateId = () => {
    return `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const addDownload = useCallback(
    async (filename: string, downloadFn: () => Promise<Blob>) => {
      const id = generateId();
      const startTime = Date.now();

      // Add task to queue
      const newTask: DownloadTask = {
        id,
        filename,
        status: 'pending',
        progress: 0,
        startTime,
      };

      setTasks((prev) => [...prev, newTask]);

      try {
        // Update status to downloading
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? { ...task, status: 'downloading' as const } : task))
        );

        // Execute download function
        const blob = await downloadFn();

        // Update progress during download
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? { ...task, progress: 100 } : task))
        );

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Mark as completed
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? { ...task, status: 'completed' as const } : task))
        );

        // Show success toast
        toast({
          title: 'Download Complete',
          description: `${filename} downloaded successfully`,
          variant: 'success',
        });

        // Auto-remove completed task after 10 seconds
        setTimeout(() => {
          setTasks((prev) => prev.filter((task) => task.id !== id));
        }, 10000);
      } catch (error) {
        console.error('Download failed:', error);

        // Mark as error
        setTasks((prev) =>
          prev.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : 'Download failed',
                }
              : task
          )
        );

        // Show error toast
        toast({
          title: 'Download Failed',
          description: `Failed to download ${filename}. Please try again.`,
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((task) => task.status !== 'completed'));
  }, []);

  const value: DownloadQueueContextType = {
    tasks,
    addDownload,
    removeTask,
    clearCompleted,
  };

  return <DownloadQueueContext.Provider value={value}>{children}</DownloadQueueContext.Provider>;
};

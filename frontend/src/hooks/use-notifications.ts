/**
 * Centralized notification hook for consistent toast messages across the application
 */

import { useToast } from '@/hooks/use-toast';

export interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
}

/**
 * Hook providing standardized notification methods
 */
export const useNotifications = () => {
  const { toast } = useToast();

  return {
    /**
     * Show a success notification
     */
    success: (message: string, description?: string) => {
      toast({
        title: message,
        description,
        variant: 'success',
      });
    },

    /**
     * Show an error notification
     */
    error: (message: string, error?: unknown) => {
      const description = error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'An unexpected error occurred';

      toast({
        title: message,
        description,
        variant: 'destructive',
      });
    },

    /**
     * Show a warning notification
     */
    warning: (message: string, description?: string) => {
      toast({
        title: message,
        description,
        variant: 'default',
      });
    },

    /**
     * Show an info notification
     */
    info: (message: string, description?: string) => {
      toast({
        title: message,
        description,
        variant: 'default',
      });
    },

    /**
     * Show a loading notification and handle promise resolution
     */
    promise: async <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      }
    ): Promise<T> => {
      toast({
        title: messages.loading,
        variant: 'default',
      });

      try {
        const result = await promise;
        toast({
          title: messages.success,
          variant: 'success',
        });
        return result;
      } catch (error) {
        toast({
          title: messages.error,
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
        throw error;
      }
    },
  };
};

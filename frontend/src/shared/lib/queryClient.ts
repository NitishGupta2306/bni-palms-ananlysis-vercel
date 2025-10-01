import { QueryClient } from '@tanstack/react-query';

interface QueryError {
  response?: {
    status: number;
  };
}

// Create a query client with default configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // GC time: Data stays in cache for 10 minutes after going unused (renamed from cacheTime in v5)
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: (failureCount, error: unknown) => {
        const queryError = error as QueryError;
        // Don't retry on 4xx errors (client errors)
        const status = queryError?.response?.status;
        if (status !== undefined && status >= 400 && status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable background refetch when window gains focus
      refetchOnWindowFocus: false,
      // Enable background refetch when reconnecting to network
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Error handler for mutations
export const mutationErrorHandler = (error: unknown) => {
  const queryError = error as QueryError;
  console.error('Mutation error:', error);

  // You can add global error handling here
  // For example, showing toast notifications for specific error types
  if (queryError?.response?.status === 401) {
    // Handle authentication errors
    console.error('Authentication error');
  } else if (queryError?.response?.status && queryError.response.status >= 500) {
    // Handle server errors
    console.error('Server error');
  }
};
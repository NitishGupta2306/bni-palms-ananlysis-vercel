import React from 'react';
import { render, screen, waitFor } from '@/test-utils';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test-utils/server';
import ChapterDashboard from '@/components/ChapterDashboard';

// Test component for React Query behavior
const TestQueryComponent: React.FC<{ queryKey: string }> = ({ queryKey }) => {
  const { data, isLoading, error, isStale, isFetching } = useQuery({
    queryKey: [queryKey],
    queryFn: () => fetch('/api/test').then(res => res.json()),
    staleTime: 1000,
    cacheTime: 5000,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div>
      <div data-testid="data">{JSON.stringify(data)}</div>
      <div data-testid="stale">{isStale ? 'stale' : 'fresh'}</div>
      <div data-testid="fetching">{isFetching ? 'fetching' : 'idle'}</div>
    </div>
  );
};

describe('React Query Integration', () => {
  beforeEach(() => {
    // Clear React Query cache
    const queryClient = new QueryClient();
    queryClient.clear();
  });

  describe('Caching Behavior', () => {
    it('caches chapter data correctly', async () => {
      const { rerender } = render(<ChapterDashboard />);

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText('Chapter A')).toBeInTheDocument();
      });

      // Unmount component
      rerender(<div />);

      // Remount component - should show cached data immediately
      rerender(<ChapterDashboard />);

      // Should show data immediately from cache (no loading state)
      expect(screen.getByText('Chapter A')).toBeInTheDocument();
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    it('respects stale time configuration', async () => {
      server.use(
        http.get('/api/test', () => {
          return HttpResponse.json({ timestamp: Date.now() });
        })
      );

      const { rerender } = render(<TestQueryComponent queryKey="stale-test" />);

      await waitFor(() => {
        expect(screen.getByTestId('data')).toBeInTheDocument();
        expect(screen.getByTestId('stale')).toHaveTextContent('fresh');
      });

      // Wait for stale time to pass
      await new Promise(resolve => setTimeout(resolve, 1100));

      rerender(<TestQueryComponent queryKey="stale-test" />);

      await waitFor(() => {
        expect(screen.getByTestId('stale')).toHaveTextContent('stale');
      });
    });

    it('maintains separate caches for different query keys', async () => {
      server.use(
        http.get('/api/test', ({ request }) => {
          const url = new URL(request.url);
          const id = url.searchParams.get('id') || 'default';
          return HttpResponse.json({ id, data: `data-${id}` });
        })
      );

      const { rerender } = render(<TestQueryComponent queryKey="cache-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('data')).toHaveTextContent('data-default');
      });

      rerender(<TestQueryComponent queryKey="cache-2" />);

      await waitFor(() => {
        expect(screen.getByTestId('data')).toHaveTextContent('data-default');
      });

      // Switch back to first query - should use cache
      rerender(<TestQueryComponent queryKey="cache-1" />);
      expect(screen.getByTestId('data')).toHaveTextContent('data-default');
    });
  });

  describe('Error Handling and Retries', () => {
    it('retries failed requests according to configuration', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/chapters/', () => {
          requestCount++;
          if (requestCount < 3) {
            return HttpResponse.error();
          }
          return HttpResponse.json([
            { id: 1, name: 'Retry Success Chapter', memberCount: 10 }
          ]);
        })
      );

      render(<ChapterDashboard />);

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByText('Retry Success Chapter')).toBeInTheDocument();
      }, { timeout: 10000 });

      expect(requestCount).toBeGreaterThanOrEqual(3);
    });

    it('stops retrying non-retryable errors', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/chapters/', () => {
          requestCount++;
          return HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      render(<ChapterDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/no chapters found/i)).toBeInTheDocument();
      });

      // Should not retry 401 errors extensively
      expect(requestCount).toBeLessThan(3);
    });

    it('uses exponential backoff for retries', async () => {
      const requestTimes: number[] = [];

      server.use(
        http.get('/api/test', () => {
          requestTimes.push(Date.now());
          return HttpResponse.error();
        })
      );

      render(<TestQueryComponent queryKey="backoff-test" />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      }, { timeout: 15000 });

      // Should have multiple requests with increasing delays
      expect(requestTimes.length).toBeGreaterThan(1);

      if (requestTimes.length >= 3) {
        const delay1 = requestTimes[1] - requestTimes[0];
        const delay2 = requestTimes[2] - requestTimes[1];

        // Second delay should be longer than first (exponential backoff)
        expect(delay2).toBeGreaterThan(delay1);
      }
    });
  });

  describe('Background Refetching', () => {
    it('refetches data when component regains focus', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/test', () => {
          requestCount++;
          return HttpResponse.json({ count: requestCount });
        })
      );

      render(<TestQueryComponent queryKey="focus-test" />);

      await waitFor(() => {
        expect(screen.getByTestId('data')).toHaveTextContent('{"count":1}');
      });

      // Simulate window focus event
      window.dispatchEvent(new Event('focus'));

      await waitFor(() => {
        expect(requestCount).toBeGreaterThan(1);
      });
    });

    it('refetches stale data on window focus', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/test', () => {
          requestCount++;
          return HttpResponse.json({ count: requestCount, timestamp: Date.now() });
        })
      );

      render(<TestQueryComponent queryKey="stale-refetch" />);

      await waitFor(() => {
        expect(screen.getByTestId('data')).toHaveTextContent('"count":1');
      });

      // Wait for data to become stale
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Simulate window focus
      window.dispatchEvent(new Event('focus'));

      await waitFor(() => {
        expect(requestCount).toBe(2);
      });
    });
  });

  describe('Loading States', () => {
    it('shows correct loading states during fetch', async () => {
      server.use(
        http.get('/api/test', async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return HttpResponse.json({ data: 'loaded' });
        })
      );

      render(<TestQueryComponent queryKey="loading-test" />);

      // Should show loading initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByTestId('fetching')).toHaveTextContent('fetching');

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('data')).toHaveTextContent('loaded');
        expect(screen.getByTestId('fetching')).toHaveTextContent('idle');
      });
    });

    it('handles concurrent requests correctly', async () => {
      let activeRequests = 0;
      let maxConcurrentRequests = 0;

      server.use(
        http.get('/api/test', async () => {
          activeRequests++;
          maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);

          await new Promise(resolve => setTimeout(resolve, 500));

          activeRequests--;
          return HttpResponse.json({ data: 'concurrent-test' });
        })
      );

      // Render multiple components with same query key
      render(
        <div>
          <TestQueryComponent queryKey="concurrent" />
          <TestQueryComponent queryKey="concurrent" />
          <TestQueryComponent queryKey="concurrent" />
        </div>
      );

      await waitFor(() => {
        const dataElements = screen.getAllByTestId('data');
        expect(dataElements).toHaveLength(3);
        dataElements.forEach(el => {
          expect(el).toHaveTextContent('concurrent-test');
        });
      });

      // Should deduplicate requests - only 1 concurrent request
      expect(maxConcurrentRequests).toBe(1);
    });
  });

  describe('Cache Invalidation', () => {
    it('invalidates cache when data changes', async () => {
      let dataVersion = 1;

      server.use(
        http.get('/api/test', () => {
          return HttpResponse.json({ version: dataVersion });
        })
      );

      const { rerender } = render(<TestQueryComponent queryKey="invalidation-test" />);

      await waitFor(() => {
        expect(screen.getByTestId('data')).toHaveTextContent('"version":1');
      });

      // Update data on server
      dataVersion = 2;

      // Force refetch by remounting with different key
      rerender(<TestQueryComponent queryKey="invalidation-test-v2" />);

      await waitFor(() => {
        expect(screen.getByTestId('data')).toHaveTextContent('"version":2');
      });
    });
  });

  describe('Memory Management', () => {
    it('cleans up unused queries after cache time', async () => {
      server.use(
        http.get('/api/test', () => {
          return HttpResponse.json({ data: 'cleanup-test' });
        })
      );

      const { rerender } = render(<TestQueryComponent queryKey="cleanup-test" />);

      await waitFor(() => {
        expect(screen.getByTestId('data')).toHaveTextContent('cleanup-test');
      });

      // Unmount component
      rerender(<div />);

      // Wait beyond cache time (5000ms)
      await new Promise(resolve => setTimeout(resolve, 5500));

      // Remount - should fetch fresh data (cache should be cleared)
      rerender(<TestQueryComponent queryKey="cleanup-test" />);

      // Should show loading state again
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
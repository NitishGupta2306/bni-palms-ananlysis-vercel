/**
 * Sentry Integration for Frontend Error Tracking
 *
 * This file handles Sentry initialization for production error tracking.
 * Sentry is loaded asynchronously to avoid blocking app startup.
 *
 * Configuration via environment variables:
 * - REACT_APP_SENTRY_DSN: Your Sentry project DSN
 * - REACT_APP_SENTRY_ENVIRONMENT: Environment name (development/staging/production)
 * - REACT_APP_SENTRY_RELEASE: Optional release version
 * - REACT_APP_SENTRY_SAMPLE_RATE: Error sampling rate (default: 1.0 = 100%)
 * - REACT_APP_SENTRY_TRACES_SAMPLE_RATE: Performance tracing rate (default: 0.1 = 10%)
 */

/**
 * Initialize Sentry error tracking
 *
 * Call this function early in your app lifecycle, preferably in index.tsx
 */
export const initSentry = (): void => {
  const sentryDSN = process.env.REACT_APP_SENTRY_DSN;
  const environment = process.env.REACT_APP_SENTRY_ENVIRONMENT || process.env.NODE_ENV;
  const release = process.env.REACT_APP_SENTRY_RELEASE || 'unknown';

  // Only initialize Sentry if DSN is configured
  if (!sentryDSN) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[Sentry] Not initialized: REACT_APP_SENTRY_DSN not configured');
    }
    return;
  }

  // Load Sentry dynamically to avoid bundle bloat
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn: sentryDSN,
        environment,
        release,

        // Sample rate for error reporting (1.0 = 100%)
        sampleRate: parseFloat(
          process.env.REACT_APP_SENTRY_SAMPLE_RATE || '1.0'
        ),

        // Performance monitoring (traces)
        tracesSampleRate: parseFloat(
          process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || '0.1'
        ),

        // Integrations
        integrations: [
          new Sentry.BrowserTracing({
            // Track navigation timing
            tracingOrigins: ['localhost', /^\//],
          }),
        ],

        // Before sending error, filter sensitive data
        beforeSend(event, hint) {
          // Remove sensitive data
          if (event.request) {
            delete event.request.cookies;
          }

          // Filter out noisy errors
          const error = hint.originalException as Error;
          if (error && error.message) {
            // Ignore network errors
            if (error.message.includes('Network Error')) {
              return null;
            }

            // Ignore cancelled requests
            if (error.message.includes('Cancel')) {
              return null;
            }

            // Ignore script loading errors (often from extensions)
            if (error.message.includes('Loading chunk')) {
              return null;
            }
          }

          return event;
        },

        // Ignore specific errors
        ignoreErrors: [
          // Browser extension errors
          'top.GLOBALS',
          'chrome-extension://',
          'moz-extension://',

          // ResizeObserver errors (benign)
          'ResizeObserver loop',

          // Common non-actionable errors
          'Non-Error promise rejection captured',
        ],
      });

      // Set global Sentry reference for error-reporting service
      (window as any).Sentry = Sentry;

      if (process.env.NODE_ENV === 'development') {
        console.info('[Sentry] Initialized successfully', {
          environment,
          release,
        });
      }
    })
    .catch((error) => {
      console.error('[Sentry] Failed to initialize:', error);
    });
};

/**
 * Set user context for Sentry
 *
 * Call this when user logs in or chapter is selected
 */
export const setSentryUser = (userId?: string, chapterId?: string): void => {
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    const Sentry = (window as any).Sentry;
    Sentry.setUser(
      userId || chapterId
        ? {
            id: userId,
            chapterId,
          }
        : null
    );
  }
};

/**
 * Clear user context from Sentry
 *
 * Call this when user logs out
 */
export const clearSentryUser = (): void => {
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    const Sentry = (window as any).Sentry;
    Sentry.setUser(null);
  }
};

/**
 * Add breadcrumb for debugging
 *
 * Breadcrumbs help understand the events leading up to an error
 */
export const addSentryBreadcrumb = (
  message: string,
  category?: string,
  level?: 'debug' | 'info' | 'warning' | 'error'
): void => {
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    const Sentry = (window as any).Sentry;
    Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      level: level || 'info',
      timestamp: Date.now() / 1000,
    });
  }
};

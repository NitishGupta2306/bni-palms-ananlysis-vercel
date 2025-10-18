import { ErrorInfo } from 'react';

export interface ErrorReport {
  error: Error;
  errorInfo?: ErrorInfo;
  context?: ErrorContext;
  timestamp: Date;
  userAgent: string;
  url: string;
}

export interface ErrorContext {
  level: 'global' | 'route' | 'component';
  componentStack?: string;
  userId?: string;
  chapterId?: string;
  reportId?: string;
  action?: string;
  additionalData?: Record<string, any>;
}

class ErrorReportingService {
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 50;
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Report an error with context
   */
  reportError(
    error: Error,
    errorInfo?: ErrorInfo,
    context?: ErrorContext
  ): void {
    const report: ErrorReport = {
      error,
      errorInfo,
      context,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Add to queue
    this.addToQueue(report);

    // Log to console in development
    if (!this.isProduction) {
      this.logErrorToConsole(report);
    }

    // In production, you would send to an error tracking service
    // Examples: Sentry, LogRocket, Rollbar, etc.
    if (this.isProduction) {
      this.sendToErrorTrackingService(report);
    }

    // Store in localStorage for debugging
    this.storeErrorLocally(report);
  }

  /**
   * Add error to in-memory queue
   */
  private addToQueue(report: ErrorReport): void {
    this.errorQueue.push(report);

    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  /**
   * Log error to console with formatting
   */
  private logErrorToConsole(report: ErrorReport): void {
    console.group(
      `🔴 Error Report [${report.context?.level || 'unknown'}] - ${report.timestamp.toISOString()}`
    );
    console.error('Error:', report.error);
    console.error('Message:', report.error.message);
    console.error('Stack:', report.error.stack);

    if (report.errorInfo) {
      console.error('Component Stack:', report.errorInfo.componentStack);
    }

    if (report.context) {
      console.error('Context:', report.context);
    }

    console.error('URL:', report.url);
    console.error('User Agent:', report.userAgent);
    console.groupEnd();
  }

  /**
   * Send error to external tracking service (Sentry)
   *
   * Sentry integration is configured via environment variables:
   * - REACT_APP_SENTRY_DSN: Sentry Data Source Name
   * - REACT_APP_SENTRY_ENVIRONMENT: Environment (development/production)
   */
  private sendToErrorTrackingService(report: ErrorReport): void {
    // Check if Sentry is available (loaded via script or npm package)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry;

      Sentry.captureException(report.error, {
        contexts: {
          react: {
            componentStack: report.errorInfo?.componentStack,
          },
          custom: report.context,
        },
        tags: {
          level: report.context?.level || 'unknown',
          chapterId: report.context?.chapterId,
          action: report.context?.action,
        },
        extra: {
          ...report.context?.additionalData,
          url: report.url,
          userAgent: report.userAgent,
        },
        user: report.context?.userId ? {
          id: report.context.userId,
        } : undefined,
      });
    } else {
      // Fallback: send to custom backend endpoint for logging
      this.sendToBackendLogger(report);
    }
  }

  /**
   * Fallback: Send error to backend logging endpoint
   */
  private async sendToBackendLogger(report: ErrorReport): Promise<void> {
    try {
      await fetch('/api/errors/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: report.error.message,
          stack: report.error.stack,
          name: report.error.name,
          context: report.context,
          timestamp: report.timestamp.toISOString(),
          url: report.url,
          userAgent: report.userAgent,
        }),
      });
    } catch (e) {
      // Silently fail - don't want error reporting to cause more errors
      if (!this.isProduction) {
        console.warn('Failed to send error to backend logger:', e);
      }
    }
  }

  /**
   * Store error in localStorage for debugging
   */
  private storeErrorLocally(report: ErrorReport): void {
    try {
      const stored = this.getStoredErrors();
      const serialized = {
        message: report.error.message,
        stack: report.error.stack,
        name: report.error.name,
        componentStack: report.errorInfo?.componentStack,
        context: report.context,
        timestamp: report.timestamp.toISOString(),
        url: report.url,
      };

      stored.push(serialized);

      // Keep only last 20 errors
      if (stored.length > 20) {
        stored.shift();
      }

      localStorage.setItem('app_error_logs', JSON.stringify(stored));
    } catch (e) {
      console.error('Failed to store error locally:', e);
    }
  }

  /**
   * Get errors from localStorage
   */
  getStoredErrors(): any[] {
    try {
      const stored = localStorage.getItem('app_error_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  clearStoredErrors(): void {
    localStorage.removeItem('app_error_logs');
    this.errorQueue = [];
  }

  /**
   * Get recent errors from queue
   */
  getRecentErrors(limit = 10): ErrorReport[] {
    return this.errorQueue.slice(-limit);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byLevel: Record<string, number>;
    recent: ErrorReport[];
  } {
    const byLevel: Record<string, number> = {};

    this.errorQueue.forEach((report) => {
      const level = report.context?.level || 'unknown';
      byLevel[level] = (byLevel[level] || 0) + 1;
    });

    return {
      total: this.errorQueue.length,
      byLevel,
      recent: this.getRecentErrors(5),
    };
  }
}

// Export singleton instance
export const errorReporting = new ErrorReportingService();

// Helper function for reporting errors outside of React components
export const reportError = (
  error: Error,
  context?: Omit<ErrorContext, 'level'>
): void => {
  errorReporting.reportError(error, undefined, {
    level: 'global',
    ...context,
  });
};

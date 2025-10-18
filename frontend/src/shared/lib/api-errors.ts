// API Error Handler - Simple implementation for handling API errors

export interface ApiError {
  status?: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

interface ErrorWithResponse {
  response?: {
    status: number;
    data?: {
      message?: string;
      code?: string;
      [key: string]: unknown;
    };
  };
  request?: unknown;
  message?: string;
}

export class ApiErrorHandler {
  static formatError(error: unknown): ApiError {
    const err = error as ErrorWithResponse;
    // Handle Axios errors
    if (err.response) {
      return {
        status: err.response.status,
        message: err.response.data?.message || err.message || 'API Error',
        code: err.response.data?.code,
        details: err.response.data as Record<string, unknown>
      };
    }

    // Handle network errors
    if (err.request) {
      return {
        message: 'Network error - please check your connection',
        code: 'NETWORK_ERROR'
      };
    }

    // Handle other errors
    return {
      message: err.message || 'Unknown error occurred',
      code: 'UNKNOWN_ERROR'
    };
  }

  static getUserMessage(error: ApiError): string {
    // Return user-friendly messages based on error codes
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'INVALID_FILE_FORMAT':
        return 'Please upload a valid Excel file (.xlsx or .xls)';
      case 'FILE_TOO_LARGE':
        return 'File is too large. Maximum size is 10MB.';
      case 'PROCESSING_ERROR':
        return 'Error processing the uploaded file. Please check the file format and try again.';
      case 'RATE_LIMIT_ERROR':
        return 'Too many requests. Please wait a moment before trying again.';
      default:
        if (error.status === 404) {
          return 'The requested resource was not found.';
        }
        if (error.status === 403) {
          return 'You do not have permission to perform this action.';
        }
        if (error.status === 500) {
          return 'Server error. Please try again later.';
        }
        return error.message || 'An unexpected error occurred.';
    }
  }

  static logError(error: ApiError, context?: string): void {
    // Log error details for debugging
    console.error(`${context ? `[${context}]` : '[API Error]'}`, {
      status: error.status,
      message: error.message,
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString()
    });
  }
}
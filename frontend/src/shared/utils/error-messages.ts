/**
 * Centralized Error Messages Library
 *
 * Provides user-friendly, actionable error messages for common failure scenarios.
 * All messages follow UX best practices:
 * - Clear, non-technical language
 * - Actionable next steps
 * - Context-specific guidance
 */

export interface ErrorMessage {
  title: string;
  message: string;
  action?: string;
}

// Authentication Errors
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: {
    title: "Login Failed",
    message: "The password you entered is incorrect. Please try again.",
    action: "Double-check your password and try again"
  },
  SESSION_EXPIRED: {
    title: "Session Expired",
    message: "Your session has expired for security reasons. Please log in again.",
    action: "Return to login page"
  },
  UNAUTHORIZED: {
    title: "Access Denied",
    message: "You don't have permission to access this page.",
    action: "Contact your administrator if you need access"
  }
} as const;

// File Upload Errors
export const UPLOAD_ERRORS = {
  FILE_TOO_LARGE: (maxSize: string) => ({
    title: "File Too Large",
    message: `The file you're trying to upload is too large. Maximum size is ${maxSize}.`,
    action: "Try compressing your file or removing unnecessary data"
  }),
  INVALID_FORMAT: (allowedFormats: string) => ({
    title: "Invalid File Format",
    message: `This file format is not supported. Please upload ${allowedFormats} files only.`,
    action: "Convert your file to a supported format and try again"
  }),
  CORRUPTED_FILE: {
    title: "File Cannot Be Read",
    message: "The file appears to be corrupted or damaged and cannot be processed.",
    action: "Try opening the file in Excel to verify it's valid, then upload again"
  },
  UPLOAD_FAILED: {
    title: "Upload Failed",
    message: "We couldn't upload your file. This might be due to a network issue.",
    action: "Check your internet connection and try again"
  },
  MISSING_REQUIRED_COLUMNS: (columns: string[]) => ({
    title: "Missing Required Data",
    message: `Your file is missing required columns: ${columns.join(", ")}`,
    action: "Download the template and make sure all required columns are present"
  }),
  INVALID_DATA_FORMAT: (field: string) => ({
    title: "Invalid Data Format",
    message: `The data in "${field}" is not in the correct format.`,
    action: "Please check the format requirements and update your file"
  })
} as const;

// Network Errors
export const NETWORK_ERRORS = {
  NO_CONNECTION: {
    title: "No Internet Connection",
    message: "We can't reach the server. Please check your internet connection.",
    action: "Verify you're connected to the internet and try again"
  },
  TIMEOUT: {
    title: "Request Timed Out",
    message: "The server took too long to respond. This might be due to a slow connection.",
    action: "Try again in a moment"
  },
  SERVER_ERROR: {
    title: "Server Error",
    message: "Something went wrong on our end. Our team has been notified.",
    action: "Please try again in a few minutes"
  },
  SERVICE_UNAVAILABLE: {
    title: "Service Temporarily Unavailable",
    message: "The service is temporarily unavailable. We're working to restore it.",
    action: "Please try again in a few minutes"
  }
} as const;

// Data Errors
export const DATA_ERRORS = {
  NOT_FOUND: (resource: string) => ({
    title: "Not Found",
    message: `The ${resource} you're looking for doesn't exist or has been removed.`,
    action: "Please check the information and try again"
  }),
  LOAD_FAILED: (resource: string) => ({
    title: "Failed to Load Data",
    message: `We couldn't load ${resource}. This might be a temporary issue.`,
    action: "Try refreshing the page"
  }),
  SAVE_FAILED: {
    title: "Changes Not Saved",
    message: "We couldn't save your changes. Please try again.",
    action: "Make sure you're connected to the internet and try saving again"
  },
  DELETE_FAILED: (resource: string) => ({
    title: "Delete Failed",
    message: `We couldn't delete the ${resource}. Please try again.`,
    action: "Refresh the page and try again"
  }),
  DUPLICATE_ENTRY: (field: string) => ({
    title: "Duplicate Entry",
    message: `A ${field} with this name already exists.`,
    action: "Please use a different name"
  })
} as const;

// Validation Errors
export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: (field: string) => ({
    title: "Missing Required Field",
    message: `${field} is required and cannot be empty.`,
    action: `Please enter a ${field}`
  }),
  INVALID_EMAIL: {
    title: "Invalid Email",
    message: "The email address you entered is not valid.",
    action: "Please enter a valid email address (e.g., name@example.com)"
  },
  INVALID_DATE: {
    title: "Invalid Date",
    message: "The date you entered is not valid.",
    action: "Please enter a valid date (MM/YYYY format)"
  },
  MIN_LENGTH: (field: string, min: number) => ({
    title: "Input Too Short",
    message: `${field} must be at least ${min} characters long.`,
    action: `Please enter at least ${min} characters`
  }),
  MAX_LENGTH: (field: string, max: number) => ({
    title: "Input Too Long",
    message: `${field} cannot be longer than ${max} characters.`,
    action: `Please shorten to ${max} characters or less`
  })
} as const;

// Comparison Errors
export const COMPARISON_ERRORS = {
  NO_DATA: {
    title: "No Data Available",
    message: "There's no data available for the selected months.",
    action: "Upload PALMS reports for these months first"
  },
  SAME_MONTH: {
    title: "Invalid Selection",
    message: "You've selected the same month twice. Please choose two different months.",
    action: "Select different months to compare"
  },
  INSUFFICIENT_DATA: {
    title: "Not Enough Data",
    message: "You need data from at least two different months to create a comparison.",
    action: "Upload data for additional months and try again"
  }
} as const;

// Export Errors
export const EXPORT_ERRORS = {
  GENERATION_FAILED: {
    title: "Export Failed",
    message: "We couldn't generate the export file. Please try again.",
    action: "If this continues, try with a smaller date range"
  },
  NO_DATA_TO_EXPORT: {
    title: "No Data to Export",
    message: "There's no data available to export for your selection.",
    action: "Adjust your filters or date range and try again"
  }
} as const;

// Generic Messages
export const GENERIC_MESSAGES = {
  SUCCESS: {
    title: "Success",
    message: "Your action completed successfully.",
    action: undefined
  },
  LOADING: {
    title: "Loading",
    message: "Please wait while we process your request...",
    action: undefined
  },
  CONFIRM_DELETE: (resource: string) => ({
    title: "Confirm Deletion",
    message: `Are you sure you want to delete this ${resource}? This action cannot be undone.`,
    action: "Click Delete to confirm"
  })
} as const;

/**
 * Helper function to get error message from an unknown error
 */
export const getErrorMessage = (error: unknown): ErrorMessage => {
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes("network") || error.message.includes("fetch")) {
      return NETWORK_ERRORS.NO_CONNECTION;
    }
    if (error.message.includes("timeout")) {
      return NETWORK_ERRORS.TIMEOUT;
    }
    if (error.message.includes("401") || error.message.includes("unauthorized")) {
      return AUTH_ERRORS.UNAUTHORIZED;
    }
    if (error.message.includes("404") || error.message.includes("not found")) {
      return DATA_ERRORS.NOT_FOUND("resource");
    }
    if (error.message.includes("500") || error.message.includes("server")) {
      return NETWORK_ERRORS.SERVER_ERROR;
    }

    // Generic error with the actual message
    return {
      title: "Error",
      message: error.message,
      action: "Please try again or contact support if the problem persists"
    };
  }

  // Unknown error type
  return {
    title: "Unexpected Error",
    message: "Something unexpected happened. Please try again.",
    action: "If this continues, please contact support"
  };
};

/**
 * Helper function to format error for display in toast/alert
 */
export const formatErrorForDisplay = (error: ErrorMessage): string => {
  let display = `${error.title}: ${error.message}`;
  if (error.action) {
    display += `\n\n${error.action}`;
  }
  return display;
};

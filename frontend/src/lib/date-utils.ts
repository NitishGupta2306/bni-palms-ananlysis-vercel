/**
 * Date utility functions for consistent date formatting across the application
 */

export type DateFormat = 'short' | 'long' | 'iso' | 'month-year' | 'full';

/**
 * Formats a date according to the specified format
 * @param date - Date object or ISO string
 * @param format - Format type (default: 'long')
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | null | undefined,
  format: DateFormat = 'long'
): string => {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (!isValidDate(d)) return '';

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', {
        year: '2-digit',
        month: 'short',
        day: 'numeric'
      });
    case 'long':
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'iso':
      return d.toISOString().split('T')[0];
    case 'month-year':
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });
    case 'full':
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    default:
      return d.toLocaleDateString();
  }
};

/**
 * Formats a date as relative time (e.g., "2 days ago", "Yesterday")
 * @param date - Date object or ISO string
 * @returns Relative time string
 */
export const formatRelativeTime = (date: Date | string | null | undefined): string => {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (!isValidDate(d)) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`;

  return formatDate(d, 'short');
};

/**
 * Checks if a value is a valid Date object
 * @param date - Value to check
 * @returns True if valid Date, false otherwise
 */
export const isValidDate = (date: unknown): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Parses an ISO date string into a Date object
 * @param dateString - ISO date string
 * @returns Date object or null if invalid
 */
export const parseISODate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    return isValidDate(date) ? date : null;
  } catch {
    return null;
  }
};

/**
 * Gets the start of the month for a given date
 * @param date - Date object or ISO string
 * @returns Date object at start of month
 */
export const getMonthStart = (date: Date | string = new Date()): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

/**
 * Gets the end of the month for a given date
 * @param date - Date object or ISO string
 * @returns Date object at end of month
 */
export const getMonthEnd = (date: Date | string = new Date()): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};

/**
 * Formats a month and year for display (e.g., "January 2025")
 * @param year - Year number
 * @param month - Month number (1-12)
 * @returns Formatted month-year string
 */
export const formatMonthYear = (year: number, month: number): string => {
  const date = new Date(year, month - 1, 1);
  return formatDate(date, 'month-year');
};

/**
 * Gets an array of months between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of {year, month} objects
 */
export const getMonthsBetween = (
  startDate: Date | string,
  endDate: Date | string
): Array<{ year: number; month: number }> => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const months: Array<{ year: number; month: number }> = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    months.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1
    });
    current.setMonth(current.getMonth() + 1);
  }

  return months;
};

/**
 * Checks if two dates are in the same month
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same month and year
 */
export const isSameMonth = (
  date1: Date | string,
  date2: Date | string
): boolean => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth();
};

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDate } from "./date-utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export function formatCurrency(
  amount: number,
  currency: string = "AED",
): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format month_year string (YYYY-MM) to long format (e.g., "January 2025")
 * Uses centralized date-utils to avoid duplication
 * @param monthYear - Month year string in format YYYY-MM (e.g., "2025-01")
 * @returns Formatted string (e.g., "January 2025")
 */
export function formatMonthYearLong(monthYear: string): string {
  try {
    const [year, month] = monthYear.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return formatDate(date, "month-year");
  } catch {
    return monthYear;
  }
}

/**
 * Format month_year string (YYYY-MM) to short format (e.g., "Jan 25")
 * Uses centralized date-utils to avoid duplication
 * @param monthYear - Month year string in format YYYY-MM (e.g., "2025-01")
 * @returns Formatted string (e.g., "Jan 25")
 */
export function formatMonthYearShort(monthYear: string): string {
  try {
    const [year, month] = monthYear.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return formatDate(date, "short");
  } catch {
    return monthYear;
  }
}

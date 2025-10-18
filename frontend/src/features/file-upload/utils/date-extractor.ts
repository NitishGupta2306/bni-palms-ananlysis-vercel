/**
 * Extract date from filename - supports multiple formats
 */
export const extractDateFromFilename = (filename: string): string | undefined => {
  // Try YYYY-MM-DD format first (e.g., slips-audit-report_2025-01-28.xls)
  const patternYMD = /(\d{4})-(\d{2})-(\d{2})/;
  let match = filename.match(patternYMD);
  if (match) {
    const [, year, month] = match;
    return `${year}-${month}`;
  }

  // Try MM-DD-YYYY format (e.g., Slips_Audit_Report_08-25-2025_2-26_PM.xls)
  const patternMDY = /(\d{2})-(\d{2})-(\d{4})/;
  match = filename.match(patternMDY);
  if (match) {
    const [, month, , year] = match;
    return `${year}-${month}`;
  }

  return undefined;
};

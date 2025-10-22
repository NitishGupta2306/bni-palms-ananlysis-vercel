/**
 * Shared types for Report Wizard components
 */

export interface MonthlyReportListItem {
  id: number;
  month_year: string;
  status: string;
  created_at: string;
  uploaded_at?: string | null;
  processed_at?: string | null;
  has_referral_matrix?: boolean;
  has_oto_matrix?: boolean;
  has_combination_matrix?: boolean;
  require_palms_sheets?: boolean;
  uploaded_file_names?: Array<{
    original_filename: string;
    file_type: string;
    uploaded_at?: string;
  }>;
}

export type ReportType = "single" | "multi" | "compare" | null;
export type MatrixType = "referral" | "oto" | "combination" | "tyfcb";

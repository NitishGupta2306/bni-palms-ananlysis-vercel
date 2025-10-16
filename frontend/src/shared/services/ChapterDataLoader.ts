import { read, utils } from "xlsx";
import {
  validateExcelFile,
  sanitizeSheetData,
  ExcelSecurityError,
} from "../../features/file-upload/utils/excelSecurity";
import { API_BASE_URL } from "../../config/api";
import { apiClient } from "../../lib/apiClient";

export interface ChapterInfo {
  id: string;
  name: string;
  memberFile: string;
}

export interface MonthlyReport {
  id: number;
  month_year: string;
  uploaded_at: string;
  processed_at: string | null;
  slip_audit_file: string | null;
  member_names_file: string | null;
  has_referral_matrix: boolean;
  has_oto_matrix: boolean;
  has_combination_matrix: boolean;
  week_of_date?: string | null;
  audit_period_start?: string | null;
  audit_period_end?: string | null;
  require_palms_sheets?: boolean;
  uploaded_file_names?: Array<{
    original_filename: string;
    file_type: string;
    uploaded_at: string;
    week_of?: string | null;
  }>;
}

export interface MemberDetail {
  member: {
    id: number;
    full_name: string;
    first_name: string;
    last_name: string;
    business_name: string;
    classification: string;
    email: string;
    phone: string;
  };
  stats: {
    referrals_given: number;
    referrals_received: number;
    one_to_ones_completed: number;
    tyfcb_inside_amount: number;
    tyfcb_outside_amount: number;
  };
  missing_interactions: {
    missing_otos: Array<{ id: number; name: string }>;
    missing_referrals_given_to: Array<{ id: number; name: string }>;
    missing_referrals_received_from: Array<{ id: number; name: string }>;
    priority_connections: Array<{ id: number; name: string }>;
  };
  monthly_report: {
    id: number;
    month_year: string;
    processed_at: string | null;
  };
}

export interface MemberChange {
  current_total: number;
  previous_total: number;
  change: number;
  current_unique?: number;
  previous_unique?: number;
  unique_change?: number;
  direction: string;
  status: "improved" | "declined" | "no_change";
  is_new_member: boolean;
  current_counts?: {
    neither: number;
    oto_only: number;
    referral_only: number;
    both: number;
  };
  previous_counts?: {
    neither: number;
    oto_only: number;
    referral_only: number;
    both: number;
  };
  changes?: {
    neither: number;
    oto_only: number;
    referral_only: number;
    both: number;
  };
  improvement_score?: number;
}

export interface MatrixComparison {
  members: string[];
  current_matrix: number[][];
  previous_matrix: number[][];
  member_changes: Record<string, MemberChange>;
  summary: {
    total_members: number;
    improved: number;
    declined: number;
    no_change: number;
    new_members: number;
    top_improvements: Array<{
      member: string;
      change: number;
      current: number;
      previous: number;
    }>;
    top_declines: Array<{
      member: string;
      change: number;
      current: number;
      previous: number;
    }>;
    average_change: number;
    improvement_rate: number;
  };
}

export interface ComparisonData {
  current_report: {
    id: number;
    month_year: string;
    processed_at: string;
  };
  previous_report: {
    id: number;
    month_year: string;
    processed_at: string;
  };
  referral_comparison: MatrixComparison;
  oto_comparison: MatrixComparison;
  combination_comparison: MatrixComparison;
  overall_insights: {
    referrals: {
      improved: number;
      declined: number;
      average_change: number;
      improvement_rate: number;
      top_improvers: Array<{
        member: string;
        change: number;
        current: number;
        previous: number;
      }>;
    };
    one_to_ones: {
      improved: number;
      declined: number;
      average_change: number;
      improvement_rate: number;
      top_improvers: Array<{
        member: string;
        change: number;
        current: number;
        previous: number;
      }>;
    };
    overall: {
      total_members: number;
      new_members: number;
      combination_improvement_rate: number;
      most_improved_metric: string;
    };
  };
}

export interface MemberData {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  classification?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
  joined_date?: string;
}

export interface ChapterMemberData {
  chapterName: string;
  chapterId: string;
  members: MemberData[]; // Changed from string[] to MemberData[]
  memberCount: number;
  memberFile: string;
  loadedAt: Date;
  loadError?: string;
  monthlyReports?: MonthlyReport[];
  currentReport?: MonthlyReport;
  performanceMetrics?: {
    avgReferralsPerMember: number;
    avgOTOsPerMember: number;
    totalTYFCB: number;
    topPerformer: string;
  };
}

export const REAL_CHAPTERS: ChapterInfo[] = [
  {
    id: "continental",
    name: "BNI Continental",
    memberFile: "bni-continental.xls",
  },
  { id: "elevate", name: "BNI Elevate", memberFile: "bni-elevate.xls" },
  { id: "energy", name: "BNI Energy", memberFile: "bni-energy.xls" },
  {
    id: "excelerate",
    name: "BNI Excelerate",
    memberFile: "bni-excelerate.xls",
  },
  { id: "givers", name: "BNI Givers", memberFile: "bni-givers.xls" },
  {
    id: "gladiators",
    name: "BNI Gladiators",
    memberFile: "bni-gladiators.xls",
  },
  { id: "legends", name: "BNI Legends", memberFile: "bni-legends.xls" },
  { id: "synergy", name: "BNI Synergy", memberFile: "bni-synergy.xls" },
  { id: "united", name: "BNI United", memberFile: "bni-united.xls" },
];

export const extractMemberNamesFromFile = async (
  file: File,
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    try {
      // Validate file before processing
      validateExcelFile(file);
    } catch (error) {
      reject(error);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;

        if (!data) {
          throw new ExcelSecurityError("Failed to read file data");
        }

        // Read with security options
        const workbook = read(data, {
          type: "binary",
          // Security options to prevent vulnerabilities
          raw: false,
          cellDates: false,
          cellNF: false,
          cellHTML: false,
        });

        // Validate number of sheets
        if (workbook.SheetNames.length > 10) {
          throw new ExcelSecurityError("Too many sheets in workbook");
        }

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new ExcelSecurityError("No sheets found in workbook");
        }

        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new ExcelSecurityError("Failed to read worksheet");
        }

        const jsonData = utils.sheet_to_json(worksheet);

        // Sanitize the data before processing
        const sanitizedData = sanitizeSheetData(jsonData);

        const members: string[] = [];
        sanitizedData.forEach((row: any) => {
          let firstName = "";
          let lastName = "";

          Object.keys(row).forEach((key) => {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes("first") && lowerKey.includes("name")) {
              const value = row[key];
              firstName =
                typeof value === "string" || typeof value === "number"
                  ? value.toString().trim()
                  : "";
            } else if (lowerKey.includes("last") && lowerKey.includes("name")) {
              const value = row[key];
              lastName =
                typeof value === "string" || typeof value === "number"
                  ? value.toString().trim()
                  : "";
            }
          });

          // Additional validation for member names
          if (
            firstName &&
            lastName &&
            firstName.length <= 50 &&
            lastName.length <= 50
          ) {
            // Sanitize names to remove potential harmful characters
            const sanitizedFirstName = firstName
              .replace(/[^\w\s\-'.]/g, "")
              .trim();
            const sanitizedLastName = lastName
              .replace(/[^\w\s\-'.]/g, "")
              .trim();

            if (sanitizedFirstName && sanitizedLastName) {
              members.push(`${sanitizedFirstName} ${sanitizedLastName}`);
            }
          }
        });

        // Limit number of members to prevent DoS
        if (members.length > 1000) {
          throw new ExcelSecurityError(
            "Too many members in file. Maximum allowed: 1000",
          );
        }

        resolve(members);
      } catch (error) {
        if (error instanceof ExcelSecurityError) {
          reject(error);
        } else {
          reject(
            new ExcelSecurityError(
              `Failed to process Excel file: ${error instanceof Error ? error.message : "Unknown error"}`,
            ),
          );
        }
      }
    };

    reader.onerror = () =>
      reject(new ExcelSecurityError("Failed to read file"));
    reader.readAsBinaryString(file);
  });
};

export const loadAllChapterData = async (): Promise<ChapterMemberData[]> => {
  try {
    // Call the real backend API using API_BASE_URL
    const data = await apiClient.get<any>(`/api/dashboard/`);

    // API returns array directly, not wrapped in {chapters: [...]}
    const chapters = Array.isArray(data) ? data : data.chapters || [];

    // Transform API data to match our ChapterMemberData interface
    const results: ChapterMemberData[] = chapters.map((chapter: any) => ({
      chapterName: chapter.name,
      chapterId: chapter.id.toString(), // Convert to string for consistency
      members: chapter.members || [], // Include member list from API
      memberCount: chapter.total_members || chapter.member_count || 0,
      memberFile: `${chapter.name.toLowerCase().replace(/\s+/g, "-")}.xls`,
      loadedAt: new Date(),
      monthlyReports: chapter.monthly_reports_count
        ? Array(chapter.monthly_reports_count).fill({})
        : [],
      performanceMetrics: {
        avgReferralsPerMember: chapter.avg_referrals_per_member || 0,
        avgOTOsPerMember:
          chapter.avg_one_to_ones_per_member ||
          chapter.avg_otos_per_member ||
          0,
        totalTYFCB:
          (chapter.total_tyfcb_inside || 0) +
          (chapter.total_tyfcb_outside || 0),
        topPerformer: "Loading...", // Will be loaded with chapter details
      },
    }));

    return results;
  } catch (error) {
    console.error("Failed to load chapter data from API:", error);

    // Fallback to empty chapters with error indication
    return REAL_CHAPTERS.map((chapter) => ({
      chapterName: chapter.name,
      chapterId: chapter.id,
      members: [],
      memberCount: 0,
      memberFile: chapter.memberFile,
      loadedAt: new Date(),
      loadError: error instanceof Error ? error.message : "Unknown error",
      performanceMetrics: {
        avgReferralsPerMember: 0,
        avgOTOsPerMember: 0,
        totalTYFCB: 0,
        topPerformer: "N/A",
      },
    }));
  }
};

export const loadMonthlyReports = async (
  chapterId: string,
): Promise<MonthlyReport[]> => {
  try {
    const reports = await apiClient.get<MonthlyReport[]>(
      `/api/chapters/${chapterId}/reports/`,
    );
    return reports;
  } catch (error) {
    console.error(
      `Failed to load monthly reports for chapter ${chapterId}:`,
      error,
    );
    throw error;
  }
};

export const loadMemberDetail = async (
  chapterId: string,
  reportId: number,
  memberId: number,
): Promise<MemberDetail> => {
  try {
    const memberDetail = await apiClient.get<MemberDetail>(
      `/api/chapters/${chapterId}/reports/${reportId}/members/${memberId}/`,
    );
    return memberDetail;
  } catch (error) {
    console.error(
      `Failed to load member detail for chapter ${chapterId}, report ${reportId}, member ${memberId}:`,
      error,
    );
    throw error;
  }
};

export const loadMatrixData = async (
  chapterId: string,
  reportId: number,
  matrixType: "referral-matrix" | "one-to-one-matrix" | "combination-matrix",
): Promise<any> => {
  try {
    const matrixData = await apiClient.get<any>(
      `/api/chapters/${chapterId}/reports/${reportId}/${matrixType}/`,
    );
    return matrixData;
  } catch (error) {
    console.error(
      `Failed to load ${matrixType} for chapter ${chapterId}, report ${reportId}:`,
      error,
    );
    throw error;
  }
};

export const deleteMonthlyReport = async (
  chapterId: string,
  reportId: number,
): Promise<void> => {
  try {
    await apiClient.delete(`/api/chapters/${chapterId}/reports/${reportId}/`);
  } catch (error) {
    console.error(
      `Failed to delete monthly report ${reportId} for chapter ${chapterId}:`,
      error,
    );
    throw error;
  }
};

export const generateMockPerformanceMetrics = (
  members: MemberData[],
): ChapterMemberData["performanceMetrics"] => {
  if (members.length === 0) {
    return {
      avgReferralsPerMember: 0,
      avgOTOsPerMember: 0,
      totalTYFCB: 0,
      topPerformer: "N/A",
    };
  }

  return {
    avgReferralsPerMember: Math.floor(Math.random() * 10) + 5,
    avgOTOsPerMember: Math.floor(Math.random() * 8) + 3,
    totalTYFCB: Math.floor(Math.random() * 500000) + 100000,
    topPerformer: members[Math.floor(Math.random() * members.length)].name,
  };
};

// Comparison API functions
export const loadComparisonData = async (
  chapterId: string,
  currentReportId: number,
  previousReportId: number,
): Promise<ComparisonData> => {
  try {
    const comparisonData = await apiClient.get<ComparisonData>(
      `/api/chapters/${chapterId}/reports/${currentReportId}/compare/${previousReportId}/`,
    );
    return comparisonData;
  } catch (error) {
    console.error(`Failed to load comparison for chapter ${chapterId}:`, error);
    throw error;
  }
};

export const loadReferralComparison = async (
  chapterId: string,
  currentReportId: number,
  previousReportId: number,
): Promise<{ comparison: MatrixComparison }> => {
  try {
    return await apiClient.get<{ comparison: MatrixComparison }>(
      `/api/chapters/${chapterId}/reports/${currentReportId}/compare/${previousReportId}/referrals/`,
    );
  } catch (error) {
    console.error(`Failed to load referral comparison:`, error);
    throw error;
  }
};

export const loadOTOComparison = async (
  chapterId: string,
  currentReportId: number,
  previousReportId: number,
): Promise<{ comparison: MatrixComparison }> => {
  try {
    return await apiClient.get<{ comparison: MatrixComparison }>(
      `/api/chapters/${chapterId}/reports/${currentReportId}/compare/${previousReportId}/one-to-ones/`,
    );
  } catch (error) {
    console.error(`Failed to load one-to-one comparison:`, error);
    throw error;
  }
};

export const loadCombinationComparison = async (
  chapterId: string,
  currentReportId: number,
  previousReportId: number,
): Promise<{ comparison: MatrixComparison }> => {
  try {
    return await apiClient.get<{ comparison: MatrixComparison }>(
      `/api/chapters/${chapterId}/reports/${currentReportId}/compare/${previousReportId}/combination/`,
    );
  } catch (error) {
    console.error(`Failed to load combination comparison:`, error);
    throw error;
  }
};

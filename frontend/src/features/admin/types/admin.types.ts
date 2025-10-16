export interface AdminMember {
  id: number; // Real database ID
  name: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  classification?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
  joined_date?: string;
  // Chapter context
  chapterName: string;
  chapterId: string;
}

export interface AdminChapter {
  chapterId: string;
  chapterName: string;
  members: (string | { name?: string })[];
  monthlyReports?: MonthlyReport[];
}

export interface MonthlyReport {
  id: string;
  month: string;
  year: string;
}

export interface MemberFilters {
  searchTerm: string;
  chapterFilter: string;
}

export interface ChapterFormData {
  name: string;
  location: string;
  meeting_day: string;
  meeting_time: string;
}

export interface UploadResult {
  success: boolean;
  message: string;
  details?: {
    chapters_created?: number;
    chapters_updated?: number;
    members_created?: number;
    members_updated?: number;
    total_processed?: number;
    warnings?: string[];
    // Reset result fields
    chapters?: number;
    members?: number;
    monthly_reports?: number;
    member_stats?: number;
    referrals?: number;
    one_to_ones?: number;
    tyfcbs?: number;
  };
}

export interface SystemStats {
  totalChapters: number;
  totalMembers: number;
  totalReports: number;
  lastUpdated: string;
}

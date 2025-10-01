export interface MemberAnalytics {
  member: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    business_name: string;
    classification: string;
    email: string;
    phone: string;
    joined_date?: string;
    is_active?: boolean;
  };
  chapter: {
    id: number;
    name: string;
    total_members: number;
  };
  performance: {
    referrals_given: number;
    referrals_received: number;
    one_to_ones: number;
    tyfcb_amount: number;
    performance_score: number;
  };
  gaps: {
    missing_one_to_ones: Array<{ id: number; name: string }>;
    missing_referrals_to: Array<{ id: number; name: string }>;
    missing_referrals_from: Array<{ id: number; name: string }>;
    priority_connections: Array<{ id: number; name: string }>;
  };
  recommendations: string[];
  completion_rates: {
    oto_completion: number;
    referral_given_coverage: number;
    referral_received_coverage: number;
  };
  latest_report: {
    id: number | null;
    month_year: string | null;
    processed_at: string | null;
  };
}

export interface MemberFormData {
  first_name: string;
  last_name: string;
  business_name: string;
  classification: string;
  email: string;
  phone: string;
  joined_date: string;
  is_active: boolean;
}

export interface PerformanceColor {
  variant: 'success' | 'secondary' | 'destructive';
  icon: React.ReactElement;
}

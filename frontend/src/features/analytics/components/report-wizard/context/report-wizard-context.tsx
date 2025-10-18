import React, { createContext, useContext, ReactNode } from "react";
import { ChapterData } from "@/types/chapter.types";

export type ReportType = "single" | "multi" | "compare";

export interface MonthlyReportListItem {
  id: number;
  month_year: string;
  status: string;
  created_at: string;
}

interface ReportWizardContextType {
  chapterData: ChapterData;
  currentStep: number;
  reportType: ReportType | null;
  reports: MonthlyReportListItem[];
  isLoadingReports: boolean;
  setCurrentStep: (step: number) => void;
  setReportType: (type: ReportType | null) => void;
  setReports: (reports: MonthlyReportListItem[]) => void;
  setIsLoadingReports: (loading: boolean) => void;
}

const ReportWizardContext = createContext<ReportWizardContextType | undefined>(
  undefined
);

interface ReportWizardProviderProps {
  children: ReactNode;
  value: ReportWizardContextType;
}

export const ReportWizardProvider: React.FC<ReportWizardProviderProps> = ({
  children,
  value,
}) => {
  return (
    <ReportWizardContext.Provider value={value}>
      {children}
    </ReportWizardContext.Provider>
  );
};

export const useReportWizard = () => {
  const context = useContext(ReportWizardContext);
  if (!context) {
    throw new Error(
      "useReportWizard must be used within ReportWizardProvider"
    );
  }
  return context;
};

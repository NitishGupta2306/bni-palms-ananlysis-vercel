import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MatrixData, TYFCBData } from '../types/matrix.types';
import { MonthlyReport, loadMonthlyReports, loadMatrixData } from '../../../shared/services/ChapterDataLoader';
import { API_BASE_URL } from '@/config/api';

interface UseMatrixDataReturn {
  monthlyReports: MonthlyReport[];
  selectedReport: MonthlyReport | null;
  referralMatrix: MatrixData | null;
  oneToOneMatrix: MatrixData | null;
  combinationMatrix: MatrixData | null;
  tyfcbData: TYFCBData | null;
  isLoadingReports: boolean;
  isLoadingMatrices: boolean;
  error: string | null;
  setSelectedReport: (report: MonthlyReport | null) => void;
  handleReportChange: (reportId: string) => void;
}

export const useMatrixData = (chapterId: string): UseMatrixDataReturn => {
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);

  // Fetch monthly reports with React Query caching
  const {
    data: monthlyReports = [],
    isLoading: isLoadingReports,
    error: reportsError,
  } = useQuery({
    queryKey: ['monthlyReports', chapterId],
    queryFn: () => loadMonthlyReports(chapterId),
    enabled: !!chapterId,
    // Cache for 15 minutes - reports don't change often
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Auto-select first report when reports load
  useEffect(() => {
    if (monthlyReports.length > 0 && !selectedReport) {
      setSelectedReport(monthlyReports[0]);
    }
  }, [monthlyReports, selectedReport]);

  // Fetch matrices for selected report with React Query caching
  const {
    data: matricesData,
    isLoading: isLoadingMatrices,
    error: matricesError,
  } = useQuery({
    queryKey: ['matrices', chapterId, selectedReport?.id],
    queryFn: async () => {
      if (!selectedReport) return null;

      const promises = [];

      // Load referral matrix
      if (selectedReport.has_referral_matrix) {
        promises.push(loadMatrixData(chapterId, selectedReport.id, 'referral-matrix'));
      } else {
        promises.push(Promise.resolve(null));
      }

      // Load one-to-one matrix
      if (selectedReport.has_oto_matrix) {
        promises.push(loadMatrixData(chapterId, selectedReport.id, 'one-to-one-matrix'));
      } else {
        promises.push(Promise.resolve(null));
      }

      // Load combination matrix
      if (selectedReport.has_combination_matrix) {
        promises.push(loadMatrixData(chapterId, selectedReport.id, 'combination-matrix'));
      } else {
        promises.push(Promise.resolve(null));
      }

      // Load TYFCB data
      promises.push(
        fetch(`${API_BASE_URL}/api/chapters/${chapterId}/reports/${selectedReport.id}/tyfcb-data/`)
          .then(response => response.json())
          .catch(() => null)
      );

      const [referralData, otoData, combinationData, tyfcbDataResponse] = await Promise.all(promises);

      return {
        referralMatrix: referralData,
        oneToOneMatrix: otoData,
        combinationMatrix: combinationData,
        tyfcbData: tyfcbDataResponse,
      };
    },
    enabled: !!selectedReport && !!chapterId,
    // Cache matrices for 20 minutes - they rarely change
    staleTime: 20 * 60 * 1000,
    gcTime: 40 * 60 * 1000,
    // Don't refetch on window focus - matrices are static
    refetchOnWindowFocus: false,
  });

  const handleReportChange = (reportId: string) => {
    const report = monthlyReports.find(r => r.id === parseInt(reportId));
    setSelectedReport(report || null);
  };

  const error = reportsError || matricesError ?
    (reportsError instanceof Error ? reportsError.message :
     matricesError instanceof Error ? matricesError.message :
     'Failed to load data') : null;

  return {
    monthlyReports,
    selectedReport,
    referralMatrix: matricesData?.referralMatrix || null,
    oneToOneMatrix: matricesData?.oneToOneMatrix || null,
    combinationMatrix: matricesData?.combinationMatrix || null,
    tyfcbData: matricesData?.tyfcbData || null,
    isLoadingReports,
    isLoadingMatrices,
    error,
    setSelectedReport,
    handleReportChange,
  };
};

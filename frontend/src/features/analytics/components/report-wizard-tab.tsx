import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  TrendingUp,
  GitCompare,
  Calendar,
  Download,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { formatMonthYearShort } from "@/lib/utils";
import { apiClient, fetchWithAuth } from "@/lib/apiClient";
import { API_BASE_URL } from "@/config/api";

// Import existing components we'll reuse
import { MatrixDisplay } from "./matrix-display";
import { TYFCBReport } from "./tyfcb-report";
import { useMatrixData } from "../hooks/useMatrixData";
import { ChapterMemberData } from "../../../shared/services/ChapterDataLoader";

interface MonthlyReportListItem {
  id: number;
  month_year: string;
  uploaded_at: string | null;
  processed_at: string | null;
  has_referral_matrix: boolean;
  has_oto_matrix: boolean;
  has_combination_matrix: boolean;
  require_palms_sheets: boolean;
}

interface ReportWizardTabProps {
  chapterData: ChapterMemberData;
}

type ReportType = "single" | "multi" | "compare" | null;
type MatrixType = "referral" | "oto" | "combination" | "tyfcb";

const ReportWizardTab: React.FC<ReportWizardTabProps> = ({ chapterData }) => {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [reportType, setReportType] = useState<ReportType>(null);

  // Report selection state
  const [reports, setReports] = useState<MonthlyReportListItem[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null); // Single report for single-month
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]); // Multiple reports for multi-month
  const [compareReportIds, setCompareReportIds] = useState<{
    current: number | null;
    previous: number | null;
  }>({ current: null, previous: null });

  // Options state
  const [includePalms, setIncludePalms] = useState(true);
  const [selectedMatrixTypes, setSelectedMatrixTypes] = useState<MatrixType[]>([
    "referral",
  ]); // Multiple matrix types

  // Loading states
  const [showResults, setShowResults] = useState(false);
  const [isDownloadingMatrices, setIsDownloadingMatrices] = useState(false);
  const [isDownloadingPalms, setIsDownloadingPalms] = useState(false);

  const { toast } = useToast();

  // Use existing matrix data hook for single month view
  const {
    monthlyReports,
    selectedReport,
    referralMatrix,
    oneToOneMatrix,
    combinationMatrix,
    tyfcbData,
    isLoadingMatrices,
    error: matrixError,
    handleReportChange,
  } = useMatrixData(chapterData.chapterId);

  // Load reports when component mounts
  useEffect(() => {
    loadReports();
  }, [chapterData.chapterId]);

  const loadReports = async () => {
    setIsLoadingReports(true);
    try {
      const data = await apiClient.get<MonthlyReportListItem[]>(
        `/api/chapters/${chapterData.chapterId}/reports/`,
      );
      setReports(data);

      // Auto-select most recent report
      if (data.length > 0) {
        setSelectedReportId(data[0].id);
        if (data.length >= 2) {
          setCompareReportIds({
            current: data[0].id,
            previous: data[1].id,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Step 1: Select report type
  const reportTypes = [
    {
      id: "single" as ReportType,
      icon: FileText,
      title: "Single Month Report",
      description: "View detailed matrices for one month",
      color: "bg-blue-500",
    },
    {
      id: "multi" as ReportType,
      icon: TrendingUp,
      title: "Multi-Period Analysis",
      description: "Aggregate multiple months into one report",
      color: "bg-green-500",
    },
    {
      id: "compare" as ReportType,
      icon: GitCompare,
      title: "Compare Reports",
      description: "Side-by-side comparison of two periods",
      color: "bg-purple-500",
    },
  ];

  const handleReportTypeSelect = (type: ReportType) => {
    setReportType(type);
    setShowResults(false);
    setCurrentStep(2);
  };

  const handleGenerateReport = () => {
    setShowResults(true);
    setCurrentStep(4);

    // If single month, trigger matrix data load
    if (reportType === "single" && selectedReportId) {
      handleReportChange(selectedReportId.toString());
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setReportType(null);
      setShowResults(false);
      setCurrentStep(1);
    } else if (currentStep === 3 || currentStep === 4) {
      setShowResults(false);
      setCurrentStep(2);
    }
  };

  const toggleReportSelection = (reportId: number) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId],
    );
  };

  const toggleMatrixType = (matrixType: MatrixType) => {
    setSelectedMatrixTypes((prev) => {
      if (prev.includes(matrixType)) {
        // Don't allow deselecting if it's the only one selected
        if (prev.length === 1) return prev;
        return prev.filter((type) => type !== matrixType);
      } else {
        return [...prev, matrixType];
      }
    });
  };

  const canProceed = () => {
    if (reportType === "single") return selectedReportId !== null;
    if (reportType === "multi") return selectedReportIds.length > 0;
    if (reportType === "compare")
      return (
        compareReportIds.current !== null && compareReportIds.previous !== null
      );
    return false;
  };

  // Get selected reports with PALMS
  const getReportsWithPalms = () => {
    if (reportType === "single" && selectedReportId) {
      const report = reports.find((r) => r.id === selectedReportId);
      return report?.require_palms_sheets ? [report] : [];
    }
    if (reportType === "multi") {
      return reports.filter(
        (r) => selectedReportIds.includes(r.id) && r.require_palms_sheets,
      );
    }
    return [];
  };

  // Download matrices for single or multi-month reports
  const downloadMatrices = async () => {
    setIsDownloadingMatrices(true);
    try {
      if (reportType === "single" && selectedReportId) {
        // For single month, download matrices for the selected report
        const response = await fetchWithAuth(
          `${API_BASE_URL}/api/chapters/${chapterData.chapterId}/reports/${selectedReportId}/download-matrices/`,
        );

        if (!response.ok) {
          throw new Error("Failed to download matrices");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const report = reports.find((r) => r.id === selectedReportId);
        link.download = `${chapterData.chapterName}_Matrices_${report?.month_year}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Download Complete",
          description: "Matrices downloaded successfully",
        });
      } else if (reportType === "multi" && selectedReportIds.length > 0) {
        // For multi-month, use aggregate endpoint
        const response = await fetchWithAuth(
          `${API_BASE_URL}/api/chapters/${chapterData.chapterId}/reports/aggregate/download/`,
          {
            method: "POST",
            body: JSON.stringify({
              report_ids: selectedReportIds,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to download aggregated report");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${chapterData.chapterName}_Aggregated_Report.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Download Complete",
          description: `Aggregated report for ${selectedReportIds.length} months downloaded successfully`,
        });
      }
    } catch (error) {
      console.error("Error downloading matrices:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download matrices. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingMatrices(false);
    }
  };

  // Download PALMS sheets
  const downloadPalmsSheets = async () => {
    const reportsWithPalms = getReportsWithPalms();

    if (reportsWithPalms.length === 0) {
      toast({
        title: "No PALMS Sheets Available",
        description:
          "None of the selected reports have PALMS sheets available.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloadingPalms(true);
    try {
      for (const report of reportsWithPalms) {
        const response = await fetchWithAuth(
          `${API_BASE_URL}/api/chapters/${chapterData.chapterId}/reports/${report.id}/download-palms/`,
        );

        if (!response.ok) {
          throw new Error(`Failed to download PALMS for ${report.month_year}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `PALMS_Sheets_${report.month_year}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Add small delay between downloads
        if (reportsWithPalms.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      toast({
        title: "Download Complete",
        description: `Downloaded PALMS sheets for ${reportsWithPalms.length} report(s)`,
      });
    } catch (error) {
      console.error("Error downloading PALMS sheets:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download PALMS sheets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPalms(false);
    }
  };

  // Download comparison report
  const downloadComparisonReport = async () => {
    if (!compareReportIds.current || !compareReportIds.previous) {
      toast({
        title: "Invalid Selection",
        description: "Please select two months to compare.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloadingMatrices(true);
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/chapters/${chapterData.chapterId}/reports/${compareReportIds.current}/compare/${compareReportIds.previous}/download-excel/`,
      );

      if (!response.ok) {
        throw new Error("Failed to download comparison report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const currentReport = reports.find(
        (r) => r.id === compareReportIds.current,
      );
      const previousReport = reports.find(
        (r) => r.id === compareReportIds.previous,
      );
      link.download = `${chapterData.chapterName}_Comparison_${previousReport?.month_year}_vs_${currentReport?.month_year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: "Comparison report downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading comparison report:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download comparison report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingMatrices(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">
            Report Generation Wizard
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate and download reports in a few simple steps
          </p>
        </div>
        {currentStep > 1 && (
          <Button variant="outline" onClick={handleBack}>
            ← Back
          </Button>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2 sm:gap-4">
        {[1, 2, 3, 4].map((step) => (
          <React.Fragment key={step}>
            <div
              className={`flex items-center gap-2 ${
                step <= currentStep ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  step < currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : step === currentStep
                      ? "border-primary bg-background"
                      : "border-muted bg-background"
                }`}
              >
                {step < currentStep ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{step}</span>
                )}
              </div>
              <span className="hidden sm:inline text-sm font-medium">
                {step === 1 && "Type"}
                {step === 2 && "Select"}
                {step === 3 && "Options"}
                {step === 4 && "Results"}
              </span>
            </div>
            {step < 4 && (
              <ChevronRight
                className={`h-4 w-4 ${
                  step < currentStep ? "text-primary" : "text-muted-foreground"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Report Type Selection */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle>What would you like to generate?</CardTitle>
                <CardDescription>
                  Choose the type of report you want to view or download
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {reportTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <motion.div
                        key={type.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
                          onClick={() => handleReportTypeSelect(type.id)}
                        >
                          <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                              <div
                                className={`p-4 rounded-full ${type.color} text-white`}
                              >
                                <Icon className="h-8 w-8" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {type.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                  {type.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> Single Month is best for detailed
                analysis, Multi-Period for trends, and Compare for
                month-over-month changes.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Step 2: Select Reports */}
        {currentStep === 2 && reportType && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      Select{" "}
                      {reportType === "single"
                        ? "Month"
                        : reportType === "multi"
                          ? "Months"
                          : "Months to Compare"}
                    </CardTitle>
                    <CardDescription>
                      {reportType === "single" &&
                        "Choose which month's data to view"}
                      {reportType === "multi" &&
                        "Select one or more months to aggregate"}
                      {reportType === "compare" &&
                        "Pick two months to compare side-by-side"}
                    </CardDescription>
                  </div>
                  {reportType === "multi" && reports.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedReportIds(reports.map((r) => r.id))
                        }
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReportIds([])}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingReports ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : reports.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No reports found. Upload some data first using the Upload
                      tab.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Single Month Selector */}
                    {reportType === "single" && (
                      <div className="space-y-3">
                        {reports.map((report) => (
                          <motion.div
                            key={report.id}
                            whileHover={{ scale: 1.01 }}
                            className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              selectedReportId === report.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => setSelectedReportId(report.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {formatMonthYearShort(report.month_year)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {report.has_referral_matrix &&
                                  report.has_oto_matrix
                                    ? "Complete data"
                                    : "Partial data"}
                                </div>
                              </div>
                            </div>
                            {report.require_palms_sheets && (
                              <Badge variant="secondary">PALMS Available</Badge>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Multi Month Selector */}
                    {reportType === "multi" && (
                      <div className="space-y-3">
                        {reports.map((report) => (
                          <motion.div
                            key={report.id}
                            whileHover={{ scale: 1.01 }}
                            className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              selectedReportIds.includes(report.id)
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => toggleReportSelection(report.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                                  selectedReportIds.includes(report.id)
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground"
                                }`}
                              >
                                {selectedReportIds.includes(report.id) && (
                                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                                )}
                              </div>
                              <Calendar className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {formatMonthYearShort(report.month_year)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {report.has_referral_matrix &&
                                  report.has_oto_matrix
                                    ? "Complete data"
                                    : "Partial data"}
                                </div>
                              </div>
                            </div>
                            {report.require_palms_sheets && (
                              <Badge variant="secondary">PALMS Available</Badge>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Compare Selector */}
                    {reportType === "compare" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Current Month */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Current Period
                            </label>
                            <div className="space-y-2">
                              {reports.map((report) => (
                                <div
                                  key={report.id}
                                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                    compareReportIds.current === report.id
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() =>
                                    setCompareReportIds((prev) => ({
                                      ...prev,
                                      current: report.id,
                                    }))
                                  }
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {formatMonthYearShort(report.month_year)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Previous Month */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Compare With
                            </label>
                            <div className="space-y-2">
                              {reports.map((report) => (
                                <div
                                  key={report.id}
                                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                    compareReportIds.previous === report.id
                                      ? "border-purple-500 bg-purple-500/5"
                                      : "border-border hover:border-purple-500/50"
                                  }`}
                                  onClick={() =>
                                    setCompareReportIds((prev) => ({
                                      ...prev,
                                      previous: report.id,
                                    }))
                                  }
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {formatMonthYearShort(report.month_year)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Selection Summary & Next Button */}
            {!isLoadingReports && reports.length > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {reportType === "single" && selectedReportId && (
                          <>1 month selected</>
                        )}
                        {reportType === "multi" && (
                          <>{selectedReportIds.length} month(s) selected</>
                        )}
                        {reportType === "compare" &&
                          compareReportIds.current &&
                          compareReportIds.previous && (
                            <>2 months selected for comparison</>
                          )}
                      </span>
                      {getReportsWithPalms().length > 0 && (
                        <Badge variant="secondary">
                          {getReportsWithPalms().length} with PALMS
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={() => setCurrentStep(3)}
                      disabled={!canProceed()}
                    >
                      Continue
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Step 3: Options */}
        {currentStep === 3 && reportType && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle>Report Options</CardTitle>
                <CardDescription>
                  Configure additional options for your report
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* PALMS Download Option */}
                {getReportsWithPalms().length > 0 && (
                  <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
                    <input
                      type="checkbox"
                      id="include-palms"
                      checked={includePalms}
                      onChange={(e) => setIncludePalms(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 mt-0.5"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="include-palms"
                        className="font-medium cursor-pointer"
                      >
                        Include PALMS Sheets
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Download original PALMS files along with the generated
                        reports ({getReportsWithPalms().length} report(s)
                        available)
                      </p>
                    </div>
                  </div>
                )}

                {/* Matrix Type Selection for Single Month */}
                {reportType === "single" && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">
                      Select matrix types to include (you can select multiple)
                    </label>
                    <div className="space-y-2">
                      {[
                        { id: "referral", label: "Referral Matrix" },
                        { id: "oto", label: "One-to-One Matrix" },
                        { id: "combination", label: "Combination Matrix" },
                        { id: "tyfcb", label: "TYFCB Report" },
                      ].map((matrix) => (
                        <div
                          key={matrix.id}
                          className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedMatrixTypes.includes(
                              matrix.id as MatrixType,
                            )
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() =>
                            toggleMatrixType(matrix.id as MatrixType)
                          }
                        >
                          <div
                            className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedMatrixTypes.includes(
                                matrix.id as MatrixType,
                              )
                                ? "bg-primary border-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {selectedMatrixTypes.includes(
                              matrix.id as MatrixType,
                            ) && (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{matrix.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary Section */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Report Summary</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Report Type:</span>
                      <span className="font-medium text-foreground">
                        {reportType === "single" && "Single Month"}
                        {reportType === "multi" && "Multi-Period"}
                        {reportType === "compare" && "Comparison"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Periods Selected:</span>
                      <span className="font-medium text-foreground">
                        {reportType === "single" && "1"}
                        {reportType === "multi" && selectedReportIds.length}
                        {reportType === "compare" && "2"}
                      </span>
                    </div>
                    {reportType === "single" && (
                      <div className="flex justify-between">
                        <span>Matrix Types:</span>
                        <span className="font-medium text-foreground">
                          {selectedMatrixTypes.length} selected
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      Ready to generate report
                    </span>
                  </div>
                  <Button onClick={handleGenerateReport} size="lg">
                    <Download className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Results */}
        {currentStep === 4 && reportType && showResults && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Success Banner */}
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      Report Generated Successfully
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your report is ready to view and download
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Content - Single Month */}
            {reportType === "single" && selectedReportId && selectedReport && (
              <div className="space-y-6">
                {/* Download Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Download Options</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={downloadMatrices}
                      disabled={isDownloadingMatrices}
                    >
                      {isDownloadingMatrices ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download Matrices (Excel)
                        </>
                      )}
                    </Button>
                    {includePalms && getReportsWithPalms().length > 0 && (
                      <Button
                        variant="outline"
                        onClick={downloadPalmsSheets}
                        disabled={isDownloadingPalms}
                      >
                        {isDownloadingPalms ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Download PALMS Sheets
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Matrix Display - Show all selected matrix types */}
                {selectedMatrixTypes.includes("referral") && referralMatrix && (
                  <MatrixDisplay
                    matrixData={referralMatrix}
                    title="Referral Matrix"
                    description="Shows who has given referrals to whom. Numbers represent the count of referrals given."
                    matrixType="referral"
                  />
                )}
                {selectedMatrixTypes.includes("oto") && oneToOneMatrix && (
                  <MatrixDisplay
                    matrixData={oneToOneMatrix}
                    title="One-to-One Matrix"
                    description="Tracks one-to-one meetings between members. Numbers represent the count of meetings."
                    matrixType="oto"
                  />
                )}
                {selectedMatrixTypes.includes("combination") &&
                  combinationMatrix && (
                    <MatrixDisplay
                      matrixData={combinationMatrix}
                      title="Combination Matrix"
                      description="Combined view showing both referrals and one-to-ones using coded values."
                      matrixType="combination"
                    />
                  )}
                {selectedMatrixTypes.includes("tyfcb") && tyfcbData && (
                  <TYFCBReport tyfcbData={tyfcbData} />
                )}

                {isLoadingMatrices && (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
            )}

            {/* Results Content - Multi Month */}
            {reportType === "multi" && selectedReportIds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Aggregated Report</CardTitle>
                  <CardDescription>
                    Combined data from {selectedReportIds.length} month(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Multi-month aggregation generates a comprehensive Excel
                      report with all selected periods combined.
                    </AlertDescription>
                  </Alert>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={downloadMatrices}
                      disabled={isDownloadingMatrices}
                    >
                      {isDownloadingMatrices ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download Aggregated Report
                        </>
                      )}
                    </Button>
                    {includePalms && getReportsWithPalms().length > 0 && (
                      <Button
                        variant="outline"
                        onClick={downloadPalmsSheets}
                        disabled={isDownloadingPalms}
                      >
                        {isDownloadingPalms ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Download PALMS ({getReportsWithPalms().length}{" "}
                            files)
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Content - Compare */}
            {reportType === "compare" &&
              compareReportIds.current &&
              compareReportIds.previous && (
                <Card>
                  <CardHeader>
                    <CardTitle>Comparison Report</CardTitle>
                    <CardDescription>
                      Side-by-side analysis of selected periods
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Comparison view shows metrics, trends, and changes
                        between the two selected periods.
                      </AlertDescription>
                    </Alert>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={downloadComparisonReport}
                        disabled={isDownloadingMatrices}
                      >
                        {isDownloadingMatrices ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Download Comparison Report
                          </>
                        )}
                      </Button>
                    </div>
                    {/* Note: Full comparison view would be integrated from existing ComparisonTab */}
                  </CardContent>
                </Card>
              )}

            {/* Start Over Button */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Want to generate a different report?
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReportType(null);
                      setShowResults(false);
                      setCurrentStep(1);
                    }}
                  >
                    Start Over
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportWizardTab;

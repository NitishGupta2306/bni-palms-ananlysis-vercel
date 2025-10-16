import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Calendar, AlertCircle, Download, FileSpreadsheet, Zap, Clock, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loadComparisonData, loadMonthlyReports } from '../../../shared/services/ChapterDataLoader';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { API_BASE_URL } from '@/config/api';

interface ComparisonTabProps {
  chapterId: string;
}

const ComparisonTab: React.FC<ComparisonTabProps> = ({ chapterId }) => {
  const [currentReportId, setCurrentReportId] = useState<number | null>(null);
  const [previousReportId, setPreviousReportId] = useState<number | null>(null);

  // Fetch monthly reports with React Query caching
  const {
    data: monthlyReports = [],
    isLoading: loadingReports,
    error: reportsError,
  } = useQuery({
    queryKey: ['monthlyReports', chapterId],
    queryFn: () => loadMonthlyReports(chapterId),
    enabled: !!chapterId,
    // Cache for 15 minutes - reports don't change often
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Fetch comparison data with React Query caching
  const {
    data: comparisonData,
    isLoading: loading,
    error: comparisonError,
    refetch: fetchComparison,
  } = useQuery({
    queryKey: ['comparison', chapterId, currentReportId, previousReportId],
    queryFn: () => loadComparisonData(chapterId, currentReportId!, previousReportId!),
    enabled: false, // Don't auto-fetch, only fetch on button click
    // Cache for 20 minutes - comparisons are expensive
    staleTime: 20 * 60 * 1000,
    gcTime: 40 * 60 * 1000,
  });

  const error = reportsError || comparisonError
    ? (reportsError instanceof Error ? reportsError.message :
       comparisonError instanceof Error ? comparisonError.message :
       'Failed to load data')
    : null;

  // Sort reports by month_year descending (newest first)
  const sortedReports = [...monthlyReports].sort((a, b) =>
    b.month_year.localeCompare(a.month_year)
  );

  // Auto-select most recent 2 months when reports load
  useEffect(() => {
    if (sortedReports.length >= 2 && !currentReportId && !previousReportId) {
      setCurrentReportId(sortedReports[0].id);
      setPreviousReportId(sortedReports[1].id);
    }
  }, [sortedReports, currentReportId, previousReportId]);

  // Quick compare helpers
  const handleQuickCompare = (type: 'last2' | 'last3') => {
    if (type === 'last2' && sortedReports.length >= 2) {
      setCurrentReportId(sortedReports[0].id);
      setPreviousReportId(sortedReports[1].id);
    } else if (type === 'last3' && sortedReports.length >= 3) {
      setCurrentReportId(sortedReports[0].id);
      setPreviousReportId(sortedReports[2].id);
    }
  };

  const handleCompare = async () => {
    if (!currentReportId || !previousReportId) {
      return; // Error will be shown by validation below
    }

    if (currentReportId === previousReportId) {
      return; // Error will be shown by validation below
    }

    // Trigger the React Query fetch
    await fetchComparison();
  };

  const handleDownloadExcel = () => {
    if (!currentReportId || !previousReportId) return;

    const url = `${API_BASE_URL}/api/chapters/${chapterId}/reports/${currentReportId}/compare/${previousReportId}/download-excel/`;
    window.location.href = url;
  };

  // Show loading state while fetching reports
  if (loadingReports) {
    return <LoadingSkeleton message="Loading monthly reports..." variant="card" />;
  }

  return (
    <div className="space-y-6">
      {/* Month Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Compare Months
              </CardTitle>
              <CardDescription>
                Analyze performance trends between two reporting periods
              </CardDescription>
            </div>
            {sortedReports.length >= 2 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickCompare('last2')}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Last 2 Months
                </Button>
                {sortedReports.length >= 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickCompare('last3')}
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    3 Months Apart
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedReports.length >= 2 ? (
            <>
              <div className="space-y-4">
                {/* Current Month */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Month</label>
                  <Select
                    value={currentReportId?.toString()}
                    onValueChange={(value) => setCurrentReportId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select current month" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedReports.map((report) => (
                        <SelectItem key={report.id} value={report.id.toString()}>
                          {report.month_year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Previous Month */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Previous Month</label>
                  <Select
                    value={previousReportId?.toString()}
                    onValueChange={(value) => setPreviousReportId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select previous month" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedReports.map((report) => (
                        <SelectItem key={report.id} value={report.id.toString()}>
                          {report.month_year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Compare Button */}
                <Button
                  onClick={handleCompare}
                  disabled={loading || !currentReportId || !previousReportId || currentReportId === previousReportId}
                  className="w-full"
                >
                  {loading ? 'Comparing...' : 'Compare'}
                </Button>
              </div>

              {/* Validation errors */}
              {!currentReportId && !previousReportId && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Please select both months to compare</AlertDescription>
                </Alert>
              )}
              {currentReportId && previousReportId && currentReportId === previousReportId && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Please select two different months</AlertDescription>
                </Alert>
              )}

              {/* API errors */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <EmptyState
              icon={FileSpreadsheet}
              title="Not Enough Data Yet"
              description={`You need at least 2 monthly reports to compare performance. ${monthlyReports.length === 1 ? 'You have 1 report uploaded.' : ''} Upload more monthly reports to unlock comparison features.`}
              action={{
                label: 'Upload Report',
                onClick: () => window.location.href = '/chapters',
                icon: Upload
              }}
              variant="default"
            />
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparisonData && (
        <div className="space-y-6">
          {/* Comparison Tabs */}
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Preview & Download
              </TabsTrigger>
              <TabsTrigger value="summary">
                <TrendingUp className="h-4 w-4 mr-2" />
                Summary
              </TabsTrigger>
            </TabsList>

            {/* Preview Tab - Matrix with Download Button */}
            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Combination Matrix Comparison</CardTitle>
                      <CardDescription>
                        Comparing {comparisonData.current_report.month_year} vs {comparisonData.previous_report.month_year}
                      </CardDescription>
                    </div>
                    <Button onClick={handleDownloadExcel} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <FileSpreadsheet className="h-4 w-4" />
                    <AlertDescription>
                      Download the full comparison Excel file to view the detailed combination matrix with:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Current combination matrix (0=Neither, 1=OTO Only, 2=Referral Only, 3=Both)</li>
                        <li>Aggregate counts for each category</li>
                        <li>Current vs Previous Referrals with change indicators</li>
                        <li>Current vs Previous "Neither" count with change indicators</li>
                        <li>Color-coded improvements (green) and declines (red)</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Summary Tab - All Insights */}
            <TabsContent value="summary" className="space-y-4">
              {/* Overall Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Overall Performance Summary</CardTitle>
                  <CardDescription>
                    Comparing {comparisonData.current_report.month_year} vs {comparisonData.previous_report.month_year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Members</p>
                      <p className="text-2xl font-bold">{comparisonData.overall_insights.overall.total_members}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">New Members</p>
                      <p className="text-2xl font-bold text-blue-500">{comparisonData.overall_insights.overall.new_members}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Referral Improvement Rate</p>
                      <p className="text-2xl font-bold text-green-500">{comparisonData.overall_insights.referrals.improvement_rate}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">OTO Improvement Rate</p>
                      <p className="text-2xl font-bold text-green-500">{comparisonData.overall_insights.one_to_ones.improvement_rate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Referrals Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Referral Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-green-950/50 border border-green-900 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">
                        {comparisonData.referral_comparison.summary.improved}
                      </p>
                      <p className="text-xs text-muted-foreground">Improved</p>
                    </div>
                    <div className="text-center p-3 bg-red-950/50 border border-red-900 rounded-lg">
                      <p className="text-2xl font-bold text-red-400">
                        {comparisonData.referral_comparison.summary.declined}
                      </p>
                      <p className="text-xs text-muted-foreground">Declined</p>
                    </div>
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <p className="text-2xl font-bold">
                        {comparisonData.referral_comparison.summary.no_change}
                      </p>
                      <p className="text-xs text-muted-foreground">No Change</p>
                    </div>
                    <div className="text-center p-3 bg-blue-950/50 border border-blue-900 rounded-lg">
                      <p className="text-2xl font-bold text-blue-400">
                        {comparisonData.referral_comparison.summary.average_change.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Change</p>
                    </div>
                  </div>

                  {/* Top Improvers */}
                  {comparisonData.referral_comparison.summary.top_improvements.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        Top Improvers
                      </h4>
                      <div className="space-y-2">
                        {comparisonData.referral_comparison.summary.top_improvements.map((member, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-green-950/30 border border-green-900/50 rounded-lg">
                            <span className="font-medium">{member.member}</span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">{member.previous} → {member.current}</span>
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700">+{member.change}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Declines */}
                  {comparisonData.referral_comparison.summary.top_declines.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-400" />
                        Needs Attention
                      </h4>
                      <div className="space-y-2">
                        {comparisonData.referral_comparison.summary.top_declines.map((member, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
                            <span className="font-medium">{member.member}</span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">{member.previous} → {member.current}</span>
                              <Badge variant="destructive">{member.change}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* One-to-Ones Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>One-to-One Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-green-950/50 border border-green-900 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">
                        {comparisonData.oto_comparison.summary.improved}
                      </p>
                      <p className="text-xs text-muted-foreground">Improved</p>
                    </div>
                    <div className="text-center p-3 bg-red-950/50 border border-red-900 rounded-lg">
                      <p className="text-2xl font-bold text-red-400">
                        {comparisonData.oto_comparison.summary.declined}
                      </p>
                      <p className="text-xs text-muted-foreground">Declined</p>
                    </div>
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <p className="text-2xl font-bold">
                        {comparisonData.oto_comparison.summary.no_change}
                      </p>
                      <p className="text-xs text-muted-foreground">No Change</p>
                    </div>
                    <div className="text-center p-3 bg-blue-950/50 border border-blue-900 rounded-lg">
                      <p className="text-2xl font-bold text-blue-400">
                        {comparisonData.oto_comparison.summary.average_change.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Change</p>
                    </div>
                  </div>

                  {/* Top Improvers */}
                  {comparisonData.oto_comparison.summary.top_improvements.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        Top Improvers
                      </h4>
                      <div className="space-y-2">
                        {comparisonData.oto_comparison.summary.top_improvements.map((member, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-green-950/30 border border-green-900/50 rounded-lg">
                            <span className="font-medium">{member.member}</span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">{member.previous} → {member.current}</span>
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700">+{member.change}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Declines */}
                  {comparisonData.oto_comparison.summary.top_declines.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-400" />
                        Needs Attention
                      </h4>
                      <div className="space-y-2">
                        {comparisonData.oto_comparison.summary.top_declines.map((member, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
                            <span className="font-medium">{member.member}</span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">{member.previous} → {member.current}</span>
                              <Badge variant="destructive">{member.change}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Combined Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Combined Performance</CardTitle>
                  <CardDescription>
                    Combined view of referrals and one-to-one meetings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-green-950/50 border border-green-900 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">
                        {comparisonData.combination_comparison.summary.improved}
                      </p>
                      <p className="text-xs text-muted-foreground">Improved</p>
                    </div>
                    <div className="text-center p-3 bg-red-950/50 border border-red-900 rounded-lg">
                      <p className="text-2xl font-bold text-red-400">
                        {comparisonData.combination_comparison.summary.declined}
                      </p>
                      <p className="text-xs text-muted-foreground">Declined</p>
                    </div>
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <p className="text-2xl font-bold">
                        {comparisonData.combination_comparison.summary.no_change}
                      </p>
                      <p className="text-xs text-muted-foreground">No Change</p>
                    </div>
                    <div className="text-center p-3 bg-blue-950/50 border border-blue-900 rounded-lg">
                      <p className="text-2xl font-bold text-blue-400">
                        {comparisonData.overall_insights.overall.combination_improvement_rate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Improvement Rate</p>
                    </div>
                  </div>

                  {/* Most Improved Metric */}
                  <div className="p-4 bg-blue-950/30 border border-blue-900/50 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Most Improved Metric</p>
                    <p className="text-lg font-bold capitalize text-blue-400">{comparisonData.overall_insights.overall.most_improved_metric.replace('_', ' ')}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default ComparisonTab;

import React, { useMemo } from 'react';
import { Trophy, DollarSign, Users, Award, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChapterMemberData } from "@/shared/services/chapter-data-loader";
import { formatCurrency } from '@/lib/utils';

interface ChapterInfoTabProps {
  chapterData: ChapterMemberData;
}

const ChapterInfoTab: React.FC<ChapterInfoTabProps> = ({ chapterData }) => {
  const stats = useMemo(() => {
    const metrics = chapterData.performanceMetrics;
    const memberCount = chapterData.memberCount || 0;

    // Calculate totals from metrics (with defaults if no data)
    const totalReferrals = metrics ? Math.round(metrics.avgReferralsPerMember * memberCount) : 0;
    const totalOTOs = metrics ? Math.round(metrics.avgOTOsPerMember * memberCount) : 0;
    const totalTYFCB = metrics?.totalTYFCB || 0;
    const totalVisitors = 0; // Not available in current metrics

    // Use top performer from metrics or default
    const topPerformerName = metrics?.topPerformer || 'No data available';

    return {
      totals: { totalReferrals, totalOTOs, totalTYFCB, totalVisitors },
      topPerformer: topPerformerName,
      hasData: !!metrics
    };
  }, [chapterData]);

  return (
    <div className="space-y-6">
      {/* Chapter Overview */}
      <Card className="border-l-4 border-l-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {chapterData.chapterName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold">{chapterData.memberCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chapter ID</p>
              <p className="text-lg font-semibold">{chapterData.chapterId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reports</p>
              <p className="text-lg font-semibold">{chapterData.monthlyReports?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="text-sm font-medium">{new Date(chapterData.loadedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chapter Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Referrals
              </CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="h-4 w-4 text-blue-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totals.totalReferrals}</p>
            {stats.hasData && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Active networking
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total One-to-Ones
              </CardTitle>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="h-4 w-4 text-purple-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totals.totalOTOs}</p>
            {stats.hasData && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Strong connections
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total TYFCB
              </CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totals.totalTYFCB)}</p>
            {stats.hasData && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Business growth
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Visitors
              </CardTitle>
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Award className="h-4 w-4 text-orange-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totals.totalVisitors}</p>
            {stats.hasData && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                New prospects
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performer */}
      <Card className="border-l-4 border-l-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Top Performer This Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.hasData ? (
            <div className="flex items-center gap-4">
              <Award className="h-12 w-12 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.topPerformer}</p>
                <p className="text-sm text-muted-foreground">
                  Outstanding performance across all categories
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold text-muted-foreground">No Performance Data Available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Upload a chapter report to see detailed performance metrics and top performers
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChapterInfoTab;

import React, { useMemo } from 'react';
import { Trophy, DollarSign, Users, Award, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChapterMemberData } from '../../../../shared/services/ChapterDataLoader';
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
        <Card className="border-l-4 border-l-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Total Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totals.totalReferrals}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Total One-to-Ones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totals.totalOTOs}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total TYFCB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totals.totalTYFCB)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Total Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totals.totalVisitors}</p>
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

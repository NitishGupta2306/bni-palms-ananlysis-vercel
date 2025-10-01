import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle } from 'lucide-react';
import { MemberAnalytics } from '../types/member.types';

interface MemberStatsSectionProps {
  memberAnalytics: MemberAnalytics;
}

export const MemberStatsSection: React.FC<MemberStatsSectionProps> = ({
  memberAnalytics,
}) => {
  return (
    <>
      {/* Action Recommendations */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <CheckCircle className="mr-2 h-5 w-5" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Prioritized recommendations to improve your networking effectiveness
          </p>

          <div className="space-y-4">
            {memberAnalytics.recommendations.map((recommendation, index) => (
              <div key={index}>
                <div className="flex items-start py-3">
                  <Badge variant="default" className="mr-3 mt-1">
                    {index + 1}
                  </Badge>
                  <span className="text-sm">{recommendation}</span>
                </div>
                {index < memberAnalytics.recommendations.length - 1 && (
                  <Separator className="my-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 pt-6 border-t">
        <p className="text-sm text-muted-foreground text-center">
          Analysis based on {memberAnalytics.chapter.total_members} members in {memberAnalytics.chapter.name} •
          {memberAnalytics.latest_report.month_year && ` Latest data from ${memberAnalytics.latest_report.month_year} • `}
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </>
  );
};

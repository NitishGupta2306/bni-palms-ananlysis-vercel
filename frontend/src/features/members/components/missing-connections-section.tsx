import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User,
  UserPlus,
  ArrowLeftRight,
  UserMinus,
  DollarSign,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { MemberAnalytics } from '../types/member.types';

interface MissingConnectionsSectionProps {
  memberAnalytics: MemberAnalytics;
}

export const MissingConnectionsSection: React.FC<MissingConnectionsSectionProps> = ({
  memberAnalytics,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Missing One-to-Ones */}
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <UserPlus className="mr-2 h-5 w-5" />
            Missing One-to-Ones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Members you haven't met with yet
          </p>

          {memberAnalytics.gaps.missing_one_to_ones.length === 0 ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Great! You've had one-to-ones with all chapter members.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {memberAnalytics.gaps.missing_one_to_ones.slice(0, 8).map((member) => (
                <div key={member.id} className="flex items-center py-2">
                  <User className="h-4 w-4 mr-3 text-muted-foreground" />
                  <span className="text-sm">{member.name}</span>
                </div>
              ))}
              {memberAnalytics.gaps.missing_one_to_ones.length > 8 && (
                <p className="text-sm text-muted-foreground mt-2 ml-7">
                  +{memberAnalytics.gaps.missing_one_to_ones.length - 8} more members
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Opportunities */}
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <ArrowLeftRight className="mr-2 h-5 w-5" />
            Referral Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Members you could refer business to
          </p>

          <div className="space-y-2">
            {memberAnalytics.gaps.missing_referrals_to.slice(0, 8).map((member) => (
              <div key={member.id} className="flex items-center py-2">
                <TrendingUp className="h-4 w-4 mr-3 text-muted-foreground" />
                <span className="text-sm">{member.name}</span>
              </div>
            ))}
            {memberAnalytics.gaps.missing_referrals_to.length > 8 && (
              <p className="text-sm text-muted-foreground mt-2 ml-7">
                +{memberAnalytics.gaps.missing_referrals_to.length - 8} more members
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Potential Referral Sources */}
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <UserMinus className="mr-2 h-5 w-5" />
            Potential Referral Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Members who could refer business to you
          </p>

          <div className="space-y-2">
            {memberAnalytics.gaps.missing_referrals_from.slice(0, 8).map((member) => (
              <div key={member.id} className="flex items-center py-2">
                <DollarSign className="h-4 w-4 mr-3 text-muted-foreground" />
                <span className="text-sm">{member.name}</span>
              </div>
            ))}
            {memberAnalytics.gaps.missing_referrals_from.length > 8 && (
              <p className="text-sm text-muted-foreground mt-2 ml-7">
                +{memberAnalytics.gaps.missing_referrals_from.length - 8} more members
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

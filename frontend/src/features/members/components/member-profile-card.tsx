import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  User,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Home,
} from 'lucide-react';
import { MemberAnalytics, PerformanceColor } from '../types/member.types';

interface MemberProfileCardProps {
  memberAnalytics: MemberAnalytics;
  onBackToMembers: () => void;
  onBackToChapters: () => void;
  onEditMember: () => void;
  onDeleteMember: () => void;
}

const getPerformanceColor = (score: number): PerformanceColor => {
  if (score >= 85) return { variant: 'success', icon: <CheckCircle className="w-4 h-4" /> };
  if (score >= 70) return { variant: 'secondary', icon: <AlertTriangle className="w-4 h-4" /> };
  return { variant: 'destructive', icon: <AlertCircle className="w-4 h-4" /> };
};

export const MemberProfileCard: React.FC<MemberProfileCardProps> = ({
  memberAnalytics,
  onBackToMembers,
  onBackToChapters,
  onEditMember,
  onDeleteMember,
}) => {
  const performanceInfo = getPerformanceColor(memberAnalytics.performance.performance_score);

  return (
    <>
      {/* Breadcrumbs */}
      <div className="px-4 sm:px-6 py-4 bg-background border-b">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={onBackToChapters}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Chapters</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={onBackToMembers}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="h-4 w-4" />
                <span className="truncate max-w-[120px] sm:max-w-none">{memberAnalytics.chapter.name}</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="truncate max-w-[120px] sm:max-w-none">{memberAnalytics.member.full_name}</span>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex items-center px-4 sm:px-6 py-6 sm:py-8">
        <User className="mr-4 h-10 w-10 text-muted-foreground" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">
            {memberAnalytics.member.full_name}
          </h1>
          <p className="text-lg text-muted-foreground mb-1">
            {memberAnalytics.member.business_name} • {memberAnalytics.member.classification}
          </p>
          <p className="text-sm text-muted-foreground">
            Member of {memberAnalytics.chapter.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEditMember}
            className="hover:bg-primary hover:text-primary-foreground"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDeleteMember}
            className="hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Badge variant={performanceInfo.variant} className="text-sm px-3 py-1">
            {performanceInfo.icon}
            <span className="ml-1">{memberAnalytics.performance.performance_score}% Performance</span>
          </Badge>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              📊 Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm">Overall Performance</span>
                <span className="text-sm font-medium">{memberAnalytics.performance.performance_score}%</span>
              </div>
              <Progress
                value={memberAnalytics.performance.performance_score}
                className="h-3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {memberAnalytics.performance.referrals_given}
                </div>
                <div className="text-sm text-muted-foreground">
                  Referrals Given
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {memberAnalytics.performance.referrals_received}
                </div>
                <div className="text-sm text-muted-foreground">
                  Referrals Received
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {memberAnalytics.performance.one_to_ones}
                </div>
                <div className="text-sm text-muted-foreground">
                  One-to-Ones
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary mb-1">
                  AED {(memberAnalytics.performance.tyfcb_amount / 1000).toFixed(0)}K
                </div>
                <div className="text-sm text-muted-foreground">
                  TYFCB Generated
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              📈 Completion Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">One-to-One Meetings</span>
                  <span className="text-sm font-medium">{memberAnalytics.completion_rates.oto_completion}%</span>
                </div>
                <Progress
                  value={memberAnalytics.completion_rates.oto_completion}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Referrals Given Coverage</span>
                  <span className="text-sm font-medium">{memberAnalytics.completion_rates.referral_given_coverage}%</span>
                </div>
                <Progress
                  value={memberAnalytics.completion_rates.referral_given_coverage}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Referrals Received Coverage</span>
                  <span className="text-sm font-medium">{memberAnalytics.completion_rates.referral_received_coverage}%</span>
                </div>
                <Progress
                  value={memberAnalytics.completion_rates.referral_received_coverage}
                  className="h-2"
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Based on {memberAnalytics.chapter.total_members - 1} possible connections
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { ChapterMemberData } from "@/shared/services/chapter-data-loader";
import { useMemberDetail } from '../hooks/useMemberDetail';
import { useMemberActions } from '../hooks/useMemberActions';
import { MemberProfileCard } from './member-profile-card';
import { MemberStatsSection } from './member-stats-section';
import { MissingConnectionsSection } from './missing-connections-section';

interface MemberDetailsProps {
  chapterData: ChapterMemberData;
  memberName: string;
  onBackToMembers: () => void;
  onBackToChapters: () => void;
  onDataRefresh?: () => void;
}

const MemberDetails: React.FC<MemberDetailsProps> = ({
  chapterData,
  memberName,
  onBackToMembers,
  onBackToChapters,
  onDataRefresh,
}) => {
  const { memberAnalytics, isLoading, error, refetchMemberAnalytics } = useMemberDetail({
    chapterId: chapterData.chapterId,
    memberName,
  });

  const {
    formData,
    isSubmitting,
    openEditDialog,
    openDeleteDialog,
    setOpenEditDialog,
    setOpenDeleteDialog,
    handleFormChange,
    handleUpdateMember,
    handleConfirmDelete,
    initializeFormData,
  } = useMemberActions({
    chapterId: chapterData.chapterId,
    memberId: memberAnalytics?.member.id,
    onDataRefresh,
    onBackToMembers,
    refetchMemberAnalytics,
  });

  const handleEditMember = () => {
    if (memberAnalytics) {
      initializeFormData({
        first_name: memberAnalytics.member.first_name || '',
        last_name: memberAnalytics.member.last_name || '',
        business_name: memberAnalytics.member.business_name || '',
        classification: memberAnalytics.member.classification || '',
        email: memberAnalytics.member.email || '',
        phone: memberAnalytics.member.phone || '',
        joined_date: memberAnalytics.member.joined_date || '',
        is_active: memberAnalytics.member.is_active ?? true,
      });
      setOpenEditDialog(true);
    }
  };

  const handleDeleteMember = () => {
    setOpenDeleteDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-8">
        <Loader2 className="h-12 w-12 animate-spin mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Loading Member Analytics...
        </h2>
        <p className="text-muted-foreground">
          Analyzing referrals, one-to-ones, and TYFCB data
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4">
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load member analytics: {error}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBackToMembers}>
            Back to Members
          </Button>
          <Button variant="outline" onClick={onBackToChapters}>
            Back to Chapters
          </Button>
        </div>
      </div>
    );
  }

  if (!memberAnalytics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No analytics data available for this member.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <MemberProfileCard
        memberAnalytics={memberAnalytics}
        onBackToMembers={onBackToMembers}
        onBackToChapters={onBackToChapters}
        onEditMember={handleEditMember}
        onDeleteMember={handleDeleteMember}
      />

      <MissingConnectionsSection memberAnalytics={memberAnalytics} />

      <MemberStatsSection memberAnalytics={memberAnalytics} />

      {/* Edit Member Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <Input
              placeholder="First Name"
              value={formData.first_name}
              onChange={handleFormChange('first_name')}
              required
            />
            <Input
              placeholder="Last Name"
              value={formData.last_name}
              onChange={handleFormChange('last_name')}
              required
            />
            <Input
              placeholder="Business Name"
              value={formData.business_name}
              onChange={handleFormChange('business_name')}
              className="sm:col-span-2"
            />
            <Input
              placeholder="Classification (e.g., Accountant, Lawyer)"
              value={formData.classification}
              onChange={handleFormChange('classification')}
            />
            <Input
              placeholder="Email"
              type="email"
              value={formData.email}
              onChange={handleFormChange('email')}
            />
            <Input
              placeholder="Phone"
              value={formData.phone}
              onChange={handleFormChange('phone')}
            />
            <Input
              placeholder="Joined Date"
              type="date"
              value={formData.joined_date}
              onChange={handleFormChange('joined_date')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateMember}
              disabled={isSubmitting || !formData.first_name || !formData.last_name}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to delete "{memberAnalytics?.member.full_name}"?
            This action cannot be undone and will remove all associated data including
            performance metrics, referral history, and analytics.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberDetails;

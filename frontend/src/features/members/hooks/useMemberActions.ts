import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MemberFormData } from "../types/member.types";
import { apiClient } from "@/lib/apiClient";

interface UseMemberActionsProps {
  chapterId: string | number;
  memberId: number | undefined;
  onDataRefresh?: () => void;
  onBackToMembers?: () => void;
  refetchMemberAnalytics?: () => Promise<void>;
}

interface UseMemberActionsReturn {
  formData: MemberFormData;
  setFormData: React.Dispatch<React.SetStateAction<MemberFormData>>;
  isSubmitting: boolean;
  openEditDialog: boolean;
  openDeleteDialog: boolean;
  setOpenEditDialog: (open: boolean) => void;
  setOpenDeleteDialog: (open: boolean) => void;
  handleFormChange: (
    field: string,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpdateMember: () => Promise<void>;
  handleConfirmDelete: () => Promise<void>;
  initializeFormData: (data: Partial<MemberFormData>) => void;
}

export const useMemberActions = ({
  chapterId,
  memberId,
  onDataRefresh,
  onBackToMembers,
  refetchMemberAnalytics,
}: UseMemberActionsProps): UseMemberActionsReturn => {
  const [formData, setFormData] = useState<MemberFormData>({
    first_name: "",
    last_name: "",
    business_name: "",
    classification: "",
    email: "",
    phone: "",
    joined_date: "",
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const { toast } = useToast();

  const initializeFormData = (data: Partial<MemberFormData>) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const handleFormChange =
    (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "is_active" ? event.target.checked : event.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleUpdateMember = async () => {
    if (!memberId) return;

    setIsSubmitting(true);
    try {
      await apiClient.put(
        `/api/chapters/${chapterId}/members/${memberId}/`,
        formData,
      );

      toast({
        title: "Success",
        description: "Member updated successfully!",
      });
      setOpenEditDialog(false);

      // Refresh member analytics
      if (refetchMemberAnalytics) {
        await refetchMemberAnalytics();
      }

      // Trigger parent data refresh
      if (onDataRefresh) {
        onDataRefresh();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update member. Please try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const handleConfirmDelete = async () => {
    if (!memberId) return;

    setIsSubmitting(true);
    try {
      await apiClient.delete(
        `/api/chapters/${chapterId}/members/${memberId}/delete/`,
      );

      const memberName = `${formData.first_name} ${formData.last_name}`;
      toast({
        title: "Success",
        description: `Member "${memberName}" deleted successfully!`,
      });
      setOpenDeleteDialog(false);

      // Trigger parent data refresh
      if (onDataRefresh) {
        onDataRefresh();
      }

      // Navigate back to members list
      setTimeout(() => {
        if (onBackToMembers) {
          onBackToMembers();
        }
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete member. Please try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return {
    formData,
    setFormData,
    isSubmitting,
    openEditDialog,
    openDeleteDialog,
    setOpenEditDialog,
    setOpenDeleteDialog,
    handleFormChange,
    handleUpdateMember,
    handleConfirmDelete,
    initializeFormData,
  };
};

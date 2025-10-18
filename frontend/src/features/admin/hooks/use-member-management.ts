import { useState, useMemo, useCallback } from "react";
import { AdminMember, MemberFilters } from "../types/admin.types";
import {
  ChapterMemberData,
  MemberData,
} from "@/shared/services/chapter-data-loader";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";

export const useMemberManagement = (
  chapterData: ChapterMemberData[],
  onDataRefresh?: () => void,
) => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<MemberFilters>({
    searchTerm: "",
    chapterFilter: "all",
  });
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]); // Changed to number[] for real IDs
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [editingMember, setEditingMember] = useState<AdminMember | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Flatten all members from all chapters with chapter info
  const members = useMemo((): AdminMember[] => {
    return chapterData.flatMap((chapter) =>
      chapter.members.map((member: MemberData) => ({
        ...member,
        chapterName: chapter.chapterName,
        chapterId: chapter.chapterId,
      })),
    );
  }, [chapterData]);

  // Filter members based on search and chapter filter
  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Chapter filter
    if (filters.chapterFilter !== "all") {
      filtered = filtered.filter(
        (member) => member.chapterId === filters.chapterFilter,
      );
    }

    // Search filter
    if (filters.searchTerm) {
      filtered = filtered.filter(
        (member) =>
          member.name
            ?.toLowerCase()
            .includes(filters.searchTerm.toLowerCase()) ||
          member.chapterName
            .toLowerCase()
            .includes(filters.searchTerm.toLowerCase()),
      );
    }

    return filtered;
  }, [members, filters]);

  const handleMemberSelect = useCallback(
    (memberId: number, checked: boolean) => {
      setSelectedMembers((prev) =>
        checked ? [...prev, memberId] : prev.filter((id) => id !== memberId),
      );
    },
    [],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedMembers(filteredMembers.map((member) => member.id));
      } else {
        setSelectedMembers([]);
      }
    },
    [filteredMembers],
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedMembers.length === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedMembers.length} member(s)? This cannot be undone.`,
      )
    )
      return;

    setIsBulkDeleting(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      // Delete in sequence to avoid overwhelming the server
      for (const memberId of selectedMembers) {
        const member = members.find((m) => m.id === memberId);
        if (!member) continue;

        try {
          await apiClient.delete(
            `/api/chapters/${member.chapterId}/members/${member.id}/`,
          );
          successCount++;
        } catch (error) {
          errors.push(member.name || "Unknown");
        }
      }

      if (errors.length === 0) {
        toast({
          title: "Success",
          description: `Deleted ${successCount} member(s) successfully`,
          variant: "default",
        });
      } else {
        toast({
          title:
            errors.length < selectedMembers.length
              ? "Partial Success"
              : "Error",
          description: `Deleted ${successCount} of ${selectedMembers.length}. Failed: ${errors.join(", ")}`,
          variant:
            errors.length < selectedMembers.length ? "default" : "destructive",
        });
      }

      setSelectedMembers([]);
      if (onDataRefresh) {
        onDataRefresh();
      }
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedMembers, members, toast, onDataRefresh]);

  const handleEdit = useCallback((member: AdminMember) => {
    setEditingMember(member);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setEditingMember(null);
  }, []);

  const handleAddMember = useCallback(() => {
    setShowAddDialog(true);
  }, []);

  const handleCloseAddDialog = useCallback(() => {
    setShowAddDialog(false);
  }, []);

  const handleDelete = useCallback(
    async (member: AdminMember) => {
      if (
        !window.confirm(
          `Are you sure you want to delete ${member.name}? This cannot be undone.`,
        )
      )
        return;

      setDeletingMemberId(member.id);

      try {
        await apiClient.delete(
          `/api/chapters/${member.chapterId}/members/${member.id}/`,
        );

        toast({
          title: "Success",
          description: `${member.name} has been deleted`,
          variant: "default",
        });

        if (onDataRefresh) {
          onDataRefresh();
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Network error. Please try again.",
          variant: "destructive",
        });
      } finally {
        setDeletingMemberId(null);
      }
    },
    [toast, onDataRefresh],
  );

  const exportMemberData = useCallback(() => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Name,Chapter\n" +
      filteredMembers
        .map((member) => `"${member.name || ""}","${member.chapterName}"`)
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename =
      filters.chapterFilter === "all"
        ? "all_members.csv"
        : `${chapterData.find((c) => c.chapterId === filters.chapterFilter)?.chapterName}_members.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredMembers, filters.chapterFilter, chapterData]);

  return {
    members,
    filteredMembers,
    filters,
    setFilters,
    selectedMembers,
    deletingMemberId,
    isBulkDeleting,
    editingMember,
    showAddDialog,
    handleMemberSelect,
    handleSelectAll,
    handleBulkDelete,
    handleEdit,
    handleCloseEditDialog,
    handleAddMember,
    handleCloseAddDialog,
    handleDelete,
    exportMemberData,
  };
};

import { useState, useMemo, useCallback } from 'react';
import { AdminMember, MemberFilters } from '../types/admin.types';
import { ChapterMemberData } from '../../../shared/services/ChapterDataLoader';

export const useMemberManagement = (chapterData: ChapterMemberData[]) => {
  const [filters, setFilters] = useState<MemberFilters>({
    searchTerm: '',
    chapterFilter: 'all',
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Flatten all members from all chapters with chapter info
  const members = useMemo((): AdminMember[] => {
    return chapterData.flatMap(chapter =>
      chapter.members.map((member, index) => ({
        ...(typeof member === 'string' ? { name: member } : member),
        chapterName: chapter.chapterName,
        chapterId: chapter.chapterId,
        memberId: `${chapter.chapterId}-${index}`,
        memberIndex: index
      }))
    );
  }, [chapterData]);

  // Filter members based on search and chapter filter
  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Chapter filter
    if (filters.chapterFilter !== 'all') {
      filtered = filtered.filter(member => member.chapterId === filters.chapterFilter);
    }

    // Search filter
    if (filters.searchTerm) {
      filtered = filtered.filter(member =>
        member.name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        member.chapterName.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [members, filters]);

  const handleMemberSelect = useCallback((memberId: string, checked: boolean) => {
    setSelectedMembers(prev =>
      checked
        ? [...prev, memberId]
        : prev.filter(id => id !== memberId)
    );
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedMembers(filteredMembers.map((member, index) => `${member.chapterName}-${index}`));
    } else {
      setSelectedMembers([]);
    }
  }, [filteredMembers]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedMembers.length === 0) return;

    // TODO: Implementation would call DELETE API for each selected member
    // Reset selections
    setSelectedMembers([]);
  }, [selectedMembers]);

  const handleEdit = useCallback((member: AdminMember) => {
    // TODO: Implementation would open edit dialog or navigate to edit page
    console.log('Edit member:', member);
    alert(`Edit functionality for ${member.name} will be implemented here`);
  }, []);

  const handleDelete = useCallback(async (member: AdminMember) => {
    if (!window.confirm(`Are you sure you want to delete ${member.name}?`)) return;

    // TODO: Implementation would call DELETE API for the member
    console.log('Delete member:', member);
  }, []);

  const exportMemberData = useCallback(() => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Name,Chapter\n"
      + filteredMembers.map(member =>
          `"${member.name || ''}","${member.chapterName}"`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = filters.chapterFilter === 'all'
      ? 'all_members.csv'
      : `${chapterData.find(c => c.chapterId === filters.chapterFilter)?.chapterName}_members.csv`;
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
    handleMemberSelect,
    handleSelectAll,
    handleBulkDelete,
    handleEdit,
    handleDelete,
    exportMemberData,
  };
};

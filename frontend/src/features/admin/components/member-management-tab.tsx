import React from 'react';
import { motion } from 'framer-motion';
import { Download, Edit, Trash2, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChapterMemberData } from '../../../shared/services/ChapterDataLoader';
import { useMemberManagement } from '../hooks/useMemberManagement';

interface MemberManagementTabProps {
  chapterData: ChapterMemberData[];
  onDataRefresh: () => void;
}

export const MemberManagementTab: React.FC<MemberManagementTabProps> = ({
  chapterData,
  onDataRefresh,
}) => {
  const {
    members,
    filteredMembers,
    filters,
    setFilters,
    selectedMembers,
    deletingMemberId,
    isBulkDeleting,
    handleMemberSelect,
    handleSelectAll,
    handleBulkDelete,
    handleEdit,
    handleDelete,
    exportMemberData,
  } = useMemberManagement(chapterData, onDataRefresh);

  const totalMembers = members.length;
  const filteredCount = filteredMembers.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Member Management</h2>
          <p className="text-muted-foreground">
            Manage all members across all chapters. Perform bulk operations and export member data.
          </p>
        </div>
        <Button onClick={() => alert('Add member functionality coming soon')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Filters and Actions Bar */}
      <Card className="border-l-4 border-l-primary/30">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1 max-w-md">
                <Input
                  placeholder="Search members..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="min-w-[200px]">
                <Select
                  value={filters.chapterFilter}
                  onValueChange={(value) => setFilters({ ...filters, chapterFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chapters ({totalMembers} members)</SelectItem>
                    {chapterData.map((chapter) => (
                      <SelectItem key={chapter.chapterId} value={chapter.chapterId}>
                        {chapter.chapterName} ({chapter.members.length} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={exportMemberData}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              {selectedMembers.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="flex items-center gap-2"
                >
                  {isBulkDeleting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete ({selectedMembers.length})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  aria-label="Select all members"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Chapter</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No members found. {filters.searchTerm || filters.chapterFilter !== 'all' ? 'Try adjusting your filters.' : 'Add members to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member, index) => (
                <motion.tr
                  key={member.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={(e) => handleMemberSelect(member.id, e.target.checked)}
                      disabled={deletingMemberId === member.id || isBulkDeleting}
                      aria-label={`Select ${member.name}`}
                      className="cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{member.name || 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{member.chapterName}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={member.is_active !== false ? "default" : "secondary"}>
                      {member.is_active !== false ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(member)}
                          disabled={deletingMemberId === member.id || isBulkDeleting}
                          aria-label={`Edit ${member.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(member)}
                          disabled={deletingMemberId === member.id || isBulkDeleting}
                          aria-label={`Delete ${member.name}`}
                        >
                          {deletingMemberId === member.id ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

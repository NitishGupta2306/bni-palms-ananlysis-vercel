import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle, AlertTriangle, Trash2, Loader2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChapterMemberData } from '../../../shared/services/ChapterDataLoader';
import { useChapterManagement } from '../hooks/useChapterManagement';

interface ChapterManagementTabProps {
  chapterData: ChapterMemberData[];
  onDataRefresh: () => void;
}

export const ChapterManagementTab: React.FC<ChapterManagementTabProps> = ({
  chapterData,
  onDataRefresh,
}) => {
  const {
    showAddForm,
    formData,
    isSubmitting,
    editingChapterId,
    handleFormChange,
    handleSubmit,
    handleDelete,
    handleAddChapter,
    handleEditChapter,
    setShowAddForm,
  } = useChapterManagement(onDataRefresh);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Chapter Management</h2>
          <p className="text-muted-foreground">
            Create, monitor and manage all BNI chapters in the system.
          </p>
        </div>
        <Button onClick={handleAddChapter} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Chapter
        </Button>
      </div>

      {/* Add Chapter Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Card className="border-l-4 border-l-primary/30">
              <CardHeader>
                <CardTitle>{editingChapterId ? 'Edit Chapter' : 'Add New Chapter'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="text-sm font-medium">Chapter Name</label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={handleFormChange('name')}
                    placeholder="Enter chapter name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="location" className="text-sm font-medium">Location</label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={handleFormChange('location')}
                    placeholder="Enter location"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="meeting_day" className="text-sm font-medium">Meeting Day</label>
                  <Input
                    id="meeting_day"
                    value={formData.meeting_day}
                    onChange={handleFormChange('meeting_day')}
                    placeholder="e.g., Tuesday"
                  />
                </div>
                <div>
                  <label htmlFor="meeting_time" className="text-sm font-medium">Meeting Time</label>
                  <Input
                    id="meeting_time"
                    value={formData.meeting_time}
                    onChange={handleFormChange('meeting_time')}
                    placeholder="e.g., 9:00 AM"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingChapterId ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    editingChapterId ? 'Update Chapter' : 'Add Chapter'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chapter Name</TableHead>
              <TableHead className="text-center">Members</TableHead>
              <TableHead className="text-center">Reports</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chapterData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No chapters found. Add your first chapter to get started.
                </TableCell>
              </TableRow>
            ) : (
              chapterData.map((chapter, index) => (
                <motion.tr
                  key={chapter.chapterId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  <TableCell className="font-medium">{chapter.chapterName}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{chapter.members.length}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{chapter.monthlyReports?.length || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {(chapter.monthlyReports?.length || 0) > 0 ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        No Data
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditChapter(chapter)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(chapter.chapterId)}
                        >
                          <Trash2 className="h-4 w-4" />
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
